"""Tests for the redesigned author analytics: a dynamic Trust score, a real
leaderboard Rank, and the weekly Momentum trend (which replaced the degenerate
per-category audience reach)."""
from datetime import timedelta

import pytest
from django.utils import timezone

from blog.analytics import TRUST_WEIGHTS, author_analytics
from blog.models import Comment, Post, PostView, Subscription

pytestmark = pytest.mark.django_db


def _pub_post(author, *, published_at, slug):
    return Post.objects.create(
        author=author,
        title=slug.replace("-", " ").title(),
        slug=slug,
        content="some body words here",
        status=Post.Status.PUBLISHED,
        published_at=published_at,
    )


def _views(post, n, *, when=None):
    """Create ``n`` PostView rows, optionally back-dated (auto_now_add forces a
    second .update to move created_at)."""
    for _ in range(n):
        pv = PostView.objects.create(post=post)
        if when is not None:
            PostView.objects.filter(id=pv.id).update(created_at=when)


# --- Trust score --------------------------------------------------------------
def test_trust_score_in_range_and_breakdown_consistent(make_user):
    author = make_user(username="t1")
    _pub_post(author, published_at=timezone.now(), slug="t1-a")

    data = author_analytics(author)

    assert 0.0 <= data["trust_score"] <= 10.0
    assert set(data["trust_breakdown"]) == set(TRUST_WEIGHTS)
    # Each component contributes at most its full weight's worth of points.
    for name, pts in data["trust_breakdown"].items():
        assert 0.0 <= pts <= 10.0 * TRUST_WEIGHTS[name] + 1e-9
    # The breakdown points sum (up to rounding) to the headline score.
    assert abs(sum(data["trust_breakdown"].values()) - data["trust_score"]) < 0.15


def test_trust_rewards_recent_active_authors_over_dormant_ones(make_user):
    now = timezone.now()
    active = make_user(username="active")
    dormant = make_user(username="dormant")

    _pub_post(active, published_at=now, slug="active-fresh")
    for i in range(50):
        Subscription.objects.create(subscriber=make_user(username=f"sub{i}"), author=active)

    _pub_post(dormant, published_at=now - timedelta(days=200), slug="dormant-old")

    t_active = author_analytics(active)["trust_score"]
    t_dormant = author_analytics(dormant)["trust_score"]

    # Recency + audience + consistency all favour the active author: the score
    # genuinely varies instead of collapsing to a constant for everyone.
    assert t_active > t_dormant
    assert 0.0 <= t_dormant <= 10.0 and 0.0 <= t_active <= 10.0


def test_trust_does_not_collapse_under_auto_approve(make_user):
    """With every comment auto-approved (so approval-rate is uniformly 1.0), the
    score must still spread across authors with different audiences/recency."""
    now = timezone.now()
    scores = set()
    for i, (subs, days_old) in enumerate([(0, 120), (5, 30), (80, 0)]):
        a = make_user(username=f"prof{i}")
        _pub_post(a, published_at=now - timedelta(days=days_old), slug=f"prof{i}-p")
        for j in range(subs):
            Subscription.objects.create(subscriber=make_user(username=f"p{i}s{j}"), author=a)
        scores.add(author_analytics(a)["trust_score"])

    assert len(scores) == 3  # three distinct profiles -> three distinct scores


# --- Rank ---------------------------------------------------------------------
def test_rank_orders_authors_by_strength(make_user):
    now = timezone.now()
    a = make_user(username="rank-a")
    b = make_user(username="rank-b")
    c = make_user(username="rank-c")
    pa = _pub_post(a, published_at=now, slug="rank-a-p")
    pb = _pub_post(b, published_at=now, slug="rank-b-p")
    _pub_post(c, published_at=now, slug="rank-c-p")  # published but no recent views

    _views(pa, 10)
    _views(pb, 3)

    da, db, dc = author_analytics(a), author_analytics(b), author_analytics(c)

    assert (da["rank"], db["rank"], dc["rank"]) == (1, 2, 3)
    assert da["rank_total"] == db["rank_total"] == dc["rank_total"] == 3
    assert da["rank_percentile"] == 100
    assert db["rank_percentile"] == 67
    assert dc["rank_percentile"] == 33


def test_single_author_is_rank_one(make_user):
    a = make_user(username="solo")
    _pub_post(a, published_at=timezone.now(), slug="solo-p")
    data = author_analytics(a)
    assert data["rank"] == 1
    assert data["rank_total"] == 1
    assert data["rank_percentile"] == 100


def test_author_with_no_published_post_is_unranked_not_null(make_user):
    a = make_user(username="nopub")
    Post.objects.create(author=a, title="Draft", slug="nopub-d", content="x")  # draft only
    data = author_analytics(a)
    # Provisional last place — never null, percentile 0.
    assert isinstance(data["rank"], int) and data["rank"] >= 1
    assert data["rank_percentile"] == 0


# --- Momentum -----------------------------------------------------------------
def test_momentum_has_eight_peak_normalized_weekly_buckets(make_user):
    now = timezone.now()
    a = make_user(username="mo")
    post = _pub_post(a, published_at=now, slug="mo-p")
    _views(post, 3, when=now)                       # this week (the peak)
    _views(post, 1, when=now - timedelta(days=14))  # two weeks ago

    data = author_analytics(a)
    reach = data["audience_reach"]

    assert len(reach) == 8
    assert all(0 <= b["pct"] <= 100 for b in reach)
    assert max(b["pct"] for b in reach) == 100  # busiest week is a full bar
    assert isinstance(data["momentum_delta_pct"], (int, float))


def test_momentum_empty_when_no_views(make_user):
    a = make_user(username="mo-empty")
    _pub_post(a, published_at=timezone.now(), slug="mo-empty-p")
    data = author_analytics(a)
    assert data["audience_reach"] == []
    assert data["momentum_delta_pct"] == 0.0
