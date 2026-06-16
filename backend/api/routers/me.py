from ninja import Router

from blog.models import Post, Subscription

from ..pagination import paginate
from ..schemas import PagedPosts, PostListItemOut, SubscriptionOut
from ..serialization import paged_response

router = Router(tags=["me"])


@router.get("/posts", response=PagedPosts)
def my_posts(
    request, status: str = None, page: int = 1, page_size: int = 20
):
    """Author dashboard: the current user's posts across all statuses."""
    qs = Post.objects.filter(author=request.auth).with_related()
    if status:
        qs = qs.filter(status=status)
    qs = qs.order_by("-updated_at")
    return paged_response(PostListItemOut, paginate(request, qs, page, page_size))


@router.get("/subscriptions", response=list[SubscriptionOut])
def my_subscriptions(request):
    return list(
        Subscription.objects.filter(subscriber=request.auth).select_related("author")
    )
