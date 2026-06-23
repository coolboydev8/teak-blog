"""Author-level analytics aggregation for the dashboard.

Trust score, leaderboard Rank, and the weekly Momentum trend are all derived from
live data. The Trust model is *declarative* — its signals and weights live in
``TRUST_WEIGHTS`` / ``TRUST_PARAMS`` — so the heuristic can be tuned or extended
without touching the scoring math, and every signal is documented in one place.
"""
from __future__ import annotations

from datetime import timedelta
from math import log1p

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import TruncWeek
from django.utils import timezone

from .models import Comment, Post, Subscription

User = get_user_model()

# --- Trust score ---------------------------------------------------------------
# A weighted blend of size-independent signals, each normalized to [0, 1]. The
# weights sum to exactly 1.0, so the final score = 10 * Σ(wᵢ · clamp01(valueᵢ)) is
# provably within [0.0, 10.0]. Adding or retuning a signal is a one-line change:
# add an entry here and a value in ``_trust_values`` — the scoring loop is generic.
TRUST_WEIGHTS = {
    "engagement": 0.22,        # comments per published post (saturating)
    "audience": 0.20,          # active subscribers (log-scaled, size-independent)
    "consistency": 0.20,       # publishing cadence over the last 90 days
    "recency": 0.18,           # freshness of the latest post (half-life decay)
    "responsiveness": 0.10,    # share of comments not stuck pending moderation
    "reputation_floor": 0.10,  # constant anchor so a real, tiny author isn't ~0
}
TRUST_PARAMS = {
    "cpp_k": 3.0,                  # comments/post that yields a 0.5 engagement score
    "subs_ref": 200,              # active-subscriber count at which audience saturates
    "cadence_weeks": 13.0,        # ~13 ISO weeks in the 90-day consistency window
    "recency_halflife_days": 30.0,  # a post 30 days old contributes half its recency
}

# --- Momentum + Rank tunables --------------------------------------------------
MOMENTUM_WEEKS = 8
RANK_VIEW_WINDOW_DAYS = 30
# Composite "author strength" weights for (recent views, active subs, approved
# comments). log1p on each term keeps one viral post or one mega-author from
# dominating the leaderboard.
RANK_STRENGTH = (0.5, 0.3, 0.2)


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _delta_pct(current: int, previous: int) -> float:
    if previous == 0:
        return 100.0 if current else 0.0
    return round((current - previous) / previous * 100, 1)


def _post_view_model():
    """Return the PostView model if it has been added, else None."""
    try:
        from django.apps import apps

        return apps.get_model("blog", "PostView")
    except LookupError:
        return None


def author_analytics(user) -> dict:
    """Aggregate dashboard metrics for ``user`` as an author.

    Everything is derived from real data: totals/counts from the ORM, a
    declarative Trust score, a global leaderboard Rank, a weekly Momentum trend
    (which replaced the old per-category "audience reach" — degenerate once a blog
    settles on one category), and 30-day deltas.
    """
    now = timezone.now()

    posts = Post.objects.filter(author=user)
    agg = posts.aggregate(
        total_views=Sum("view_count"),
        total=Count("id"),
        published=Count("id", filter=Q(status=Post.Status.PUBLISHED)),
        draft=Count("id", filter=Q(status=Post.Status.DRAFT)),
        last_published_at=Max("published_at", filter=Q(status=Post.Status.PUBLISHED)),
    )
    total_views = agg["total_views"] or 0
    published = agg["published"] or 0

    comments = Comment.objects.filter(post__author=user)
    total_comments = comments.count()
    pending = comments.filter(moderation_status=Comment.Moderation.PENDING).count()

    subscriber_count = Subscription.objects.filter(author=user).count()
    active_subs = Subscription.objects.filter(author=user, is_active=True).count()

    # Distinct ISO weeks in the last 90 days that carry at least one publish.
    d90 = now - timedelta(days=90)
    active_weeks_90d = (
        posts.filter(status=Post.Status.PUBLISHED, published_at__gte=d90)
        .annotate(wk=TruncWeek("published_at"))
        .values("wk")
        .distinct()
        .count()
    )

    trust_score, trust_breakdown = _trust(
        total_comments=total_comments,
        published=published,
        pending=pending,
        active_subs=active_subs,
        active_weeks_90d=active_weeks_90d,
        last_published_at=agg["last_published_at"],
        now=now,
    )

    audience_reach, momentum_delta_pct = _momentum(user, now)

    board, total = _leaderboard(now)
    if user.id in board:
        rank = board[user.id]
        rank_total = total
        rank_percentile = round(100 * (rank_total - rank + 1) / rank_total)
    else:
        # Not yet on the board (no published posts): provisional last place.
        rank = total + 1
        rank_total = total
        rank_percentile = 0

    # Deltas (last 30d vs prior 30d).
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
        "trust_breakdown": trust_breakdown,
        "rank": rank,
        "rank_total": rank_total,
        "rank_percentile": rank_percentile,
        "audience_reach": audience_reach,
        "momentum_delta_pct": momentum_delta_pct,
    }


def _trust(
    *,
    total_comments: int,
    published: int,
    pending: int,
    active_subs: int,
    active_weeks_90d: int,
    last_published_at,
    now,
) -> tuple[float, dict]:
    """Compute the 0..10 Trust score and a per-signal point breakdown.

    Each signal is normalized to [0, 1]; the score is the weighted sum scaled by
    10. The breakdown returns how many of the 10 points each signal contributes,
    which makes the score transparent (a future tooltip / "why" view) and keeps
    the weighting honest.
    """
    cpp = total_comments / max(published, 1)
    values = {
        # Saturating x/(x+k): 3 comments/post → 0.5, never reaches 1 — rewards
        # engagement without letting a single chatty post max it out.
        "engagement": cpp / (cpp + TRUST_PARAMS["cpp_k"]),
        # Log compression keeps the first ~10 subscribers meaningful while a
        # mega-author saturates near the reference count.
        "audience": log1p(active_subs) / log1p(TRUST_PARAMS["subs_ref"]),
        "consistency": active_weeks_90d / TRUST_PARAMS["cadence_weeks"],
        "recency": (
            0.5 ** (max(0, (now - last_published_at).days) / TRUST_PARAMS["recency_halflife_days"])
            if last_published_at is not None
            else 0.0
        ),
        "responsiveness": 1.0 - pending / max(total_comments, 1),
        "reputation_floor": 1.0,
    }
    raw = sum(TRUST_WEIGHTS[k] * _clamp01(v) for k, v in values.items())
    score = round(min(10.0, max(0.0, 10.0 * raw)), 1)
    breakdown = {
        k: round(10.0 * TRUST_WEIGHTS[k] * _clamp01(values[k]), 2) for k in TRUST_WEIGHTS
    }
    return score, breakdown


def _momentum(user, now) -> tuple[list[dict], float]:
    """Weekly published-post view counts over the last ``MOMENTUM_WEEKS`` weeks,
    peak-normalized to 0..100 so the busiest week is always a full bar.

    Returns ``(buckets, delta_pct)`` where ``buckets`` reuses the existing
    ``{label, pct}`` shape (so the dashboard's bar renderer and the API schema are
    unchanged) and ``delta_pct`` compares the most-recent half of the window to the
    prior half. Empty (``[], 0.0``) when there is no view data yet, so the
    dashboard's empty state shows rather than a misleading flat chart.
    """
    PostView = _post_view_model()
    if PostView is None:
        return [], 0.0

    # Monday-aligned week starts, oldest → newest. Local time so buckets line up
    # with how an author reads "this week".
    local_now = timezone.localtime(now)
    monday = (local_now - timedelta(days=local_now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    weeks = [monday - timedelta(weeks=i) for i in range(MOMENTUM_WEEKS - 1, -1, -1)]

    rows = (
        PostView.objects.filter(
            post__author=user,
            post__status=Post.Status.PUBLISHED,
            created_at__gte=weeks[0],
        )
        .annotate(wk=TruncWeek("created_at"))
        .values("wk")
        .annotate(n=Count("id"))
    )
    by_week = {}
    for r in rows:
        wk = r["wk"]
        by_week[wk.date() if hasattr(wk, "date") else wk] = r["n"]

    counts = [by_week.get(w.date(), 0) for w in weeks]
    if sum(counts) == 0:
        return [], 0.0

    peak = max(counts) or 1
    buckets = [
        {"label": f"{w:%b} {w.day}", "pct": round(100 * c / peak)}
        for w, c in zip(weeks, counts)
    ]
    half = MOMENTUM_WEEKS // 2
    delta = _delta_pct(sum(counts[half:]), sum(counts[:half]))
    return buckets, delta


def _leaderboard(now) -> tuple[dict, int]:
    """Global author leaderboard, returning ``({author_id: rank}, total)``.

    Authors with at least one published post are ranked by a composite strength —
    ``0.5·log1p(recent_views) + 0.3·log1p(active_subs) + 0.2·log1p(approved)`` —
    over a 30-day view window so the board stays competitive and shifts with recent
    traffic. Built from a handful of *separate* grouped aggregates and composed in
    Python on purpose: counting views and comments in one multi-relation annotate
    would Cartesian-join and overcount. Cheap at this scale; for a large author
    base, precompute this on a Celery beat tick into Redis and look it up here.
    """
    author_ids = set(
        Post.objects.filter(status=Post.Status.PUBLISHED).values_list("author_id", flat=True)
    )
    if not author_ids:
        return {}, 0

    d30 = now - timedelta(days=RANK_VIEW_WINDOW_DAYS)
    views: dict[int, int] = {}
    PostView = _post_view_model()
    if PostView is not None:
        views = dict(
            PostView.objects.filter(
                post__status=Post.Status.PUBLISHED, created_at__gte=d30
            )
            .values_list("post__author")
            .annotate(n=Count("id"))
        )
    approved = dict(
        Comment.objects.filter(
            moderation_status=Comment.Moderation.APPROVED,
            post__status=Post.Status.PUBLISHED,
        )
        .values_list("post__author")
        .annotate(n=Count("id"))
    )
    subs = dict(
        Subscription.objects.filter(is_active=True)
        .values_list("author")
        .annotate(n=Count("id"))
    )

    wv, ws, wc = RANK_STRENGTH

    def strength(aid: int) -> float:
        return (
            wv * log1p(views.get(aid, 0))
            + ws * log1p(subs.get(aid, 0))
            + wc * log1p(approved.get(aid, 0))
        )

    # Sort by strength desc; tie-break on recent views desc, then id for stability.
    ranked = sorted(author_ids, key=lambda aid: (-strength(aid), -views.get(aid, 0), aid))
    board = {aid: pos for pos, aid in enumerate(ranked, start=1)}
    return board, len(ranked)
