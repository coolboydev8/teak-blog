"""Author-level analytics aggregation for the dashboard."""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone

from .models import Comment, Post, Subscription


def _delta_pct(current: int, previous: int) -> float:
    if previous == 0:
        return 100.0 if current else 0.0
    return round((current - previous) / previous * 100, 1)


def author_analytics(user) -> dict:
    """Aggregate dashboard metrics for ``user`` as an author.

    Everything here is derived from real data:
      * totals/counts straight from the ORM,
      * a documented trust-score heuristic,
      * audience reach = share of published-post views per category,
      * deltas comparing the last 30 days to the prior 30 (views use the
        PostView log when present; subscribers use their created_at).
    """
    posts = Post.objects.filter(author=user)
    agg = posts.aggregate(
        total_views=Sum("view_count"),
        total=Count("id"),
        published=Count("id", filter=Q(status=Post.Status.PUBLISHED)),
        draft=Count("id", filter=Q(status=Post.Status.DRAFT)),
    )
    total_views = agg["total_views"] or 0
    published = agg["published"] or 0

    comments = Comment.objects.filter(post__author=user)
    total_comments = comments.count()
    pending = comments.filter(moderation_status=Comment.Moderation.PENDING).count()
    approved = comments.filter(moderation_status=Comment.Moderation.APPROVED).count()
    rejected = comments.filter(moderation_status=Comment.Moderation.REJECTED).count()

    subscriber_count = Subscription.objects.filter(author=user).count()

    # Trust score (0..10): blend comment-approval rate with engagement volume.
    moderated = approved + rejected
    approved_ratio = approved / moderated if moderated else 1.0
    engagement = min((total_comments / published / 10) if published else 0.0, 1.0)
    trust_score = round(min(10.0, 5.0 + 4.0 * approved_ratio + 1.0 * engagement), 1)

    # Audience reach: per-category share of published-post views.
    by_cat = list(
        posts.published()
        .values("category__name")
        .annotate(views=Sum("view_count"))
        .order_by("-views")
    )
    cat_total = sum((row["views"] or 0) for row in by_cat)
    audience_reach = [
        {
            "label": row["category__name"] or "Uncategorized",
            "pct": round((row["views"] or 0) / cat_total * 100) if cat_total else 0,
        }
        for row in by_cat[:4]
    ]

    # Deltas (last 30d vs prior 30d).
    now = timezone.now()
    d30, d60 = now - timedelta(days=30), now - timedelta(days=60)
    cur_subs = Subscription.objects.filter(author=user, created_at__gte=d30).count()
    prev_subs = Subscription.objects.filter(
        author=user, created_at__lt=d30, created_at__gte=d60
    ).count()
    subscribers_delta_pct = _delta_pct(cur_subs, prev_subs)

    views_delta_pct = 0.0
    PostView = _post_view_model()
    if PostView is not None:
        cur_v = PostView.objects.filter(post__author=user, created_at__gte=d30).count()
        prev_v = PostView.objects.filter(
            post__author=user, created_at__lt=d30, created_at__gte=d60
        ).count()
        views_delta_pct = _delta_pct(cur_v, prev_v)

    return {
        "total_views": total_views,
        "total_posts": agg["total"] or 0,
        "published_posts": published,
        "draft_posts": agg["draft"] or 0,
        "subscriber_count": subscriber_count,
        "total_comments": total_comments,
        "pending_comments": pending,
        "views_delta_pct": views_delta_pct,
        "subscribers_delta_pct": subscribers_delta_pct,
        "trust_score": trust_score,
        "audience_reach": audience_reach,
    }


def _post_view_model():
    """Return the PostView model if it has been added, else None."""
    try:
        from django.apps import apps

        return apps.get_model("blog", "PostView")
    except LookupError:
        return None
