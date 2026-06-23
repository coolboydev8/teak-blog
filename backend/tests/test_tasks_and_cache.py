import pytest
from django.core import mail
from django.core.cache import cache
from django.utils import timezone

from blog.cache import post_list_key
from blog.models import Post, Subscription
from blog.tasks import notify_subscribers

pytestmark = pytest.mark.django_db


def _publish(api, title):
    slug = api.post("/api/posts/", {"title": title, "content": "body words here"}).json()[
        "slug"
    ]
    api.post(f"/api/posts/{slug}/publish")
    return slug


# --- Caching ------------------------------------------------------------
def test_list_response_is_cached(api, author):
    api.auth(author)
    _publish(api, "Cached Post")
    params = {
        "category": None,
        "tag": None,
        "search": None,
        "sort": None,
        "page": 1,
        "page_size": 20,
    }
    key = post_list_key(params)
    assert cache.get(key) is None
    api.client.get("/api/posts/")
    assert cache.get(key) is not None


def test_publish_invalidates_stale_list_cache(api, author):
    api.auth(author)
    _publish(api, "First")
    assert api.client.get("/api/posts/").json()["count"] == 1  # populates cache
    _publish(api, "Second")  # bumps cache version
    assert api.client.get("/api/posts/").json()["count"] == 2  # not stale


def test_detail_view_increments_count_async(api, author):
    slug = _publish(api.auth(author), "Viewed")
    api.client.get(f"/api/posts/{slug}")
    assert Post.objects.get(slug=slug).view_count == 1


def test_review_page_counts_every_view(api, author):
    """The /posts/id/<uuid> review page counts every read — including the
    author's own view of their live post."""
    slug = _publish(api.auth(author), "ById")
    post_uuid = Post.objects.get(slug=slug).uuid
    api.client.get(f"/api/posts/id/{post_uuid}")           # anonymous reader
    api.auth(author).get(f"/api/posts/id/{post_uuid}")     # the author too
    assert Post.objects.get(slug=slug).view_count == 2


def test_stats_endpoint_does_not_count_views(api, author):
    """The dashboard's /stats endpoint must never bump the count, so opening
    analytics doesn't inflate reads."""
    slug = _publish(api.auth(author), "Stats")
    post_uuid = Post.objects.get(slug=slug).uuid
    api.auth(author).get(f"/api/posts/id/{post_uuid}/stats")
    assert Post.objects.get(slug=slug).view_count == 0


# --- View-count hot path: milestones -----------------------------------
def test_reading_milestone_recorded(author):
    from blog.models import ActivityEvent
    from blog.tasks import increment_view_count

    post = Post.objects.create(
        author=author,
        title="Hot",
        slug="hot",
        content="x",
        status=Post.Status.PUBLISHED,
        published_at=timezone.now(),
        view_count=999,
    )
    increment_view_count(post.id, author.id)  # crosses 1,000 cumulative reads

    assert Post.objects.get(id=post.id).view_count == 1000
    assert ActivityEvent.objects.filter(
        user=author,
        type=ActivityEvent.Type.MILESTONE,
        metadata__threshold=1000,
    ).exists()


def test_milestone_aggregate_is_throttled(author, django_assert_num_queries):
    """After the first check arms the per-author throttle, a second view inside
    the window skips the cross-post SUM aggregate + exists() checks — only the
    counter bump and the view-log insert run."""
    from blog.tasks import increment_view_count

    post = Post.objects.create(
        author=author,
        title="Busy",
        slug="busy",
        content="x",
        status=Post.Status.PUBLISHED,
        published_at=timezone.now(),
        view_count=10,
    )
    increment_view_count(post.id, author.id)  # arms milestones:throttle:<author>

    with django_assert_num_queries(2):  # UPDATE view_count + INSERT PostView only
        increment_view_count(post.id, author.id)


# --- Notification fan-out ----------------------------------------------
def test_notify_subscribers_sends_emails(author, make_user):
    post = Post.objects.create(
        author=author,
        title="Announce",
        slug="announce",
        content="body",
        status=Post.Status.PUBLISHED,
        published_at=timezone.now(),
    )
    Subscription.objects.create(subscriber=make_user("s1"), author=author)
    Subscription.objects.create(subscriber=make_user("s2"), author=author)

    count = notify_subscribers(post.id)
    assert count == 2
    assert len(mail.outbox) == 2


def test_notify_subscribers_signs_webhook(author, make_user, monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            pass

    def fake_post(url, data=None, headers=None, timeout=None):
        captured.update(url=url, headers=headers, data=data)
        return FakeResponse()

    monkeypatch.setattr("blog.tasks.requests.post", fake_post)

    Subscription.objects.create(
        subscriber=make_user("hooky"),
        author=author,
        notification_method=Subscription.Method.WEBHOOK,
        webhook_url="https://example.test/hook",
        webhook_secret="s3cret",
    )
    post = Post.objects.create(
        author=author,
        title="Hook",
        slug="hook",
        content="body",
        status=Post.Status.PUBLISHED,
        published_at=timezone.now(),
    )

    assert notify_subscribers(post.id) == 1
    assert captured["url"] == "https://example.test/hook"
    assert captured["headers"]["X-Signature-256"].startswith("sha256=")


def test_publish_triggers_notification(api, author, make_user, django_capture_on_commit_callbacks):
    Subscription.objects.create(subscriber=make_user("fan"), author=author)
    api.auth(author)
    slug = api.post("/api/posts/", {"title": "Notify Me", "content": "body"}).json()[
        "slug"
    ]
    with django_capture_on_commit_callbacks(execute=True):
        api.post(f"/api/posts/{slug}/publish")
    assert len(mail.outbox) == 1


# --- Senior-level guarantees: concurrency-safe publish + reliable webhooks -----
def test_publish_is_idempotent_no_double_notify(
    api, author, make_user, django_capture_on_commit_callbacks
):
    """Publishing the same post twice fires the subscriber fan-out exactly once.

    The conditional-UPDATE claim (``filter(status=DRAFT).update(...)``) makes the
    DRAFT->PUBLISHED transition idempotent: the second publish matches no DRAFT
    row, so no second notification is sent."""
    Subscription.objects.create(subscriber=make_user("fan"), author=author)
    api.auth(author)
    slug = api.post("/api/posts/", {"title": "Once", "content": "body"}).json()["slug"]

    with django_capture_on_commit_callbacks(execute=True):
        assert api.post(f"/api/posts/{slug}/publish").status_code == 200
    with django_capture_on_commit_callbacks(execute=True):
        assert api.post(f"/api/posts/{slug}/publish").status_code == 200  # no-op

    assert len(mail.outbox) == 1  # notified once, not twice


class _Resp:
    def __init__(self, code):
        self.status_code = code


def _webhook(author):
    from blog.models import Webhook

    return Webhook.objects.create(
        owner=author, event="post.published", url="https://x.test/h"
    )


def test_webhook_4xx_is_terminal_not_retried(author, monkeypatch):
    """A permanent 4xx (bad URL/auth/payload) must NOT be retried."""
    from blog import tasks
    from blog.models import Webhook

    calls = {"n": 0}

    def fake_post(url, **kw):
        calls["n"] += 1
        return _Resp(404)

    monkeypatch.setattr(tasks.requests, "post", fake_post)
    hook = _webhook(author)
    tasks.deliver_webhook.apply(args=(hook.url, {"e": 1}, None, hook.id, "evt-1"))

    assert calls["n"] == 1  # delivered once, never retried
    hook.refresh_from_db()
    assert hook.health == Webhook.Health.FAILING


def test_webhook_5xx_is_classified_retryable(author, monkeypatch):
    """A transient 5xx asks Celery to retry (vs the 4xx case, which does not)."""
    import celery

    from blog import tasks

    monkeypatch.setattr(tasks.requests, "post", lambda url, **kw: _Resp(503))
    hook = _webhook(author)
    with pytest.raises(celery.exceptions.Retry):
        tasks.deliver_webhook.apply(args=(hook.url, {"e": 1}, None, hook.id, "evt-2"))


def test_webhook_dead_letters_after_exhaustion(author, monkeypatch):
    """When retries are spent and the 5xx persists, the hook is dead-lettered."""
    from blog import tasks
    from blog.models import Webhook

    monkeypatch.setattr(tasks.requests, "post", lambda url, **kw: _Resp(503))
    hook = _webhook(author)
    # Simulate the final attempt: retries already at the ceiling -> no more retry.
    tasks.deliver_webhook.apply(
        args=(hook.url, {"e": 1}, None, hook.id, "evt-2"),
        retries=tasks.WEBHOOK_MAX_RETRIES,
    )
    hook.refresh_from_db()
    assert hook.health == Webhook.Health.FAILING
