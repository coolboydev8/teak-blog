import logging
import uuid

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

logger = logging.getLogger(__name__)


def _bump_views(post_id, author_id) -> None:
    """Best-effort async view increment. A broker outage must never fail a read,
    so a failed enqueue is logged and swallowed (a dropped view bump is
    acceptable degradation)."""
    try:
        increment_view_count.delay(post_id, author_id)
    except Exception:
        logger.warning("Failed to enqueue view-count bump for post %s", post_id, exc_info=True)


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
    sort: str = None,
    page: int = 1,
    page_size: int = 20,
):
    """Public, cached list of published posts with filtering and search.

    ``sort=comments`` ranks by most (approved) comments first; otherwise the
    feed is newest-first.
    """
    params = {
        "category": category,
        "tag": tag,
        "search": search,
        "sort": sort,
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
    if sort == "comments":
        qs = qs.order_by("-comment_count", "-published_at", "-id")
    else:
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


@router.get("/id/{post_id}", response=PostDetailOut, auth=None)
def get_post_by_id(request, post_id: uuid.UUID):
    """Public post detail by uuid — the review page the SPA links to.

    Cache-aside for published posts plus an async view-count bump on **every**
    read (including the author's own — viewing the live page is a view). The
    author dashboard reads the separate ``/stats`` endpoint instead, so opening
    analytics never inflates reads. Declared before ``/{slug}`` so ``/id/<uuid>``
    is never swallowed by the slug match.
    """
    key = post_detail_key(f"id:{post_id}")
    cached = cache.get(key)
    if cached is not None:
        _bump_views(cached["id"], cached["author"]["id"])
        return cached

    post = get_object_or_404(Post.objects.with_related(), uuid=post_id)
    if post.status != Post.Status.PUBLISHED:
        user = get_optional_user(request)
        if user is None or post.author_id != user.id:
            raise HttpError(404, "Post not found.")
        return post  # owner preview: live, uncached, no view bump

    result = PostDetailOut.from_orm(post).dict()
    cache.set(key, result, settings.CACHE_TTL_POST_DETAIL)
    _bump_views(post.id, post.author_id)
    return result


@router.get("/id/{post_id}/stats", response=PostDetailOut, auth=None)
def get_post_stats(request, post_id: uuid.UUID):
    """Post detail for the author dashboard: **fresh** (no cache) so the latest
    view count shows immediately, and **no view bump** so opening the analytics
    view doesn't count as a read. Owner may view their own unpublished post.
    """
    post = get_object_or_404(Post.objects.with_related(), uuid=post_id)
    if post.status != Post.Status.PUBLISHED:
        user = get_optional_user(request)
        if user is None or post.author_id != user.id:
            raise HttpError(404, "Post not found.")
    return post


@router.get("/{slug}", response=PostDetailOut, auth=None)
def get_post(request, slug: str):
    """Public post detail. Cached for published posts; bumps view count async."""
    key = post_detail_key(slug)
    cached = cache.get(key)
    if cached is not None:
        # author_id is already in the cached payload — pass it through so the
        # async task can debounce milestones without a DB lookup.
        _bump_views(cached["id"], cached.get("author", {}).get("id"))
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
    _bump_views(post.id, post.author_id)
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


@router.post("/{slug}/unpublish", response=PostDetailOut)
def unpublish_post(request, slug: str):
    """Revert a post to draft (takes it off the public site)."""
    post = _owned_post(request, slug)
    services.unpublish_post(post=post)
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
