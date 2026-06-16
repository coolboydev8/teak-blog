from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from blog.cache import post_detail_key, post_list_key
from blog.models import Post
from blog.tasks import increment_view_count
from blog import services

from ..auth import get_optional_user
from ..pagination import paginate
from ..schemas import (
    PagedPosts,
    PostCreateIn,
    PostDetailOut,
    PostListItemOut,
    PostUpdateIn,
    RevisionOut,
)
from ..serialization import paged_response

router = Router(tags=["posts"])


def _owned_post(request, slug: str) -> Post:
    post = get_object_or_404(Post, slug=slug)
    if post.author_id != request.auth.id:
        raise HttpError(403, "You do not have permission to modify this post.")
    return post


@router.get("/", response=PagedPosts, auth=None)
def list_posts(
    request,
    category: str = None,
    tag: str = None,
    search: str = None,
    page: int = 1,
    page_size: int = 20,
):
    """Public, cached list of published posts with filtering and search."""
    params = {
        "category": category,
        "tag": tag,
        "search": search,
        "page": page,
        "page_size": page_size,
    }
    key = post_list_key(params)
    cached = cache.get(key)
    if cached is not None:
        return cached

    qs = Post.objects.published().with_related()
    if category:
        qs = qs.filter(category__slug=category)
    if tag:
        qs = qs.filter(tags__slug=tag).distinct()
    if search:
        qs = qs.filter(
            Q(title__icontains=search)
            | Q(excerpt__icontains=search)
            | Q(content__icontains=search)
        )
    qs = qs.order_by("-published_at", "-id")

    result = paged_response(PostListItemOut, paginate(request, qs, page, page_size))
    cache.set(key, result, settings.CACHE_TTL_POST_LIST)
    return result


@router.post("/", response={201: PostDetailOut})
def create_post(request, data: PostCreateIn):
    """Create a draft. Honors an optional `Idempotency-Key` request header."""
    idempotency_key = request.headers.get("Idempotency-Key")
    post = services.create_post(
        author=request.auth, data=data.dict(), idempotency_key=idempotency_key
    )
    return 201, Post.objects.with_related().get(pk=post.pk)


@router.get("/{slug}", response=PostDetailOut, auth=None)
def get_post(request, slug: str):
    """Public post detail. Cached for published posts; bumps view count async."""
    key = post_detail_key(slug)
    cached = cache.get(key)
    if cached is not None:
        increment_view_count.delay(cached["id"])
        return cached

    post = get_object_or_404(Post.objects.with_related(), slug=slug)

    if post.status != Post.Status.PUBLISHED:
        # Only the owning author may preview an unpublished post.
        user = get_optional_user(request)
        if user is None or post.author_id != user.id:
            raise HttpError(404, "Post not found.")
        return post  # live, uncached, no view-count bump

    result = PostDetailOut.from_orm(post).dict()
    cache.set(key, result, settings.CACHE_TTL_POST_DETAIL)
    increment_view_count.delay(post.id)
    return result


@router.put("/{slug}", response=PostDetailOut)
def update_post(request, slug: str, data: PostUpdateIn):
    post = _owned_post(request, slug)
    services.update_post(post=post, data=data.dict(exclude_unset=True), editor=request.auth)
    return Post.objects.with_related().get(pk=post.pk)


@router.post("/{slug}/publish", response=PostDetailOut)
def publish_post(request, slug: str):
    post = _owned_post(request, slug)
    services.publish_post(post=post)
    return Post.objects.with_related().get(pk=post.pk)


@router.post("/{slug}/archive", response=PostDetailOut)
def archive_post(request, slug: str):
    post = _owned_post(request, slug)
    services.archive_post(post=post)
    return Post.objects.with_related().get(pk=post.pk)


@router.delete("/{slug}", response={204: None})
def delete_post(request, slug: str):
    post = _owned_post(request, slug)
    services.delete_post(post=post)
    return 204, None


@router.get("/{slug}/revisions", response=list[RevisionOut])
def list_revisions(request, slug: str):
    post = _owned_post(request, slug)
    return list(post.revisions.select_related("edited_by").all())
