from ninja import Router

from blog.analytics import author_analytics
from blog.models import ActivityEvent, Comment, Post, Subscription

from ..pagination import paginate
from ..schemas import (
    ActivityOut,
    AnalyticsOut,
    CommentModerationOut,
    PagedActivity,
    PagedModerationComments,
    PagedPosts,
    PostListItemOut,
    SubscriptionOut,
    UnreadOut,
)
from ..serialization import paged_response

router = Router(tags=["me"])


@router.get("/posts", response=PagedPosts)
def my_posts(request, status: str = None, page: int = 1, page_size: int = 20):
    """Author dashboard: the current user's posts across all statuses."""
    qs = Post.objects.filter(author=request.auth).with_related()
    if status:
        qs = qs.filter(status=status)
    qs = qs.order_by("-updated_at")
    return paged_response(PostListItemOut, paginate(request, qs, page, page_size))


@router.get("/comments", response=PagedModerationComments)
def my_comments(request, status: str = None, page: int = 1, page_size: int = 20):
    """Moderation queue: every comment on the current user's posts."""
    qs = (
        Comment.objects.filter(post__author=request.auth)
        .select_related("author", "post")
        .order_by("-created_at")
    )
    if status:
        qs = qs.filter(moderation_status=status)
    return paged_response(CommentModerationOut, paginate(request, qs, page, page_size))


@router.get("/subscriptions", response=list[SubscriptionOut])
def my_subscriptions(request):
    return list(
        Subscription.objects.filter(subscriber=request.auth).select_related("author")
    )


@router.get("/analytics", response=AnalyticsOut)
def my_analytics(request):
    return author_analytics(request.auth)


@router.get("/activity", response=PagedActivity)
def my_activity(request, page: int = 1, page_size: int = 20):
    """Dashboard timeline / notification feed for the current user."""
    qs = ActivityEvent.objects.filter(user=request.auth)
    return paged_response(ActivityOut, paginate(request, qs, page, page_size))


@router.get("/notifications", response=UnreadOut)
def unread_count(request):
    return {"unread": ActivityEvent.objects.filter(user=request.auth, is_read=False).count()}


@router.post("/activity/read", response=UnreadOut)
def mark_activity_read(request):
    ActivityEvent.objects.filter(user=request.auth, is_read=False).update(is_read=True)
    return {"unread": 0}
