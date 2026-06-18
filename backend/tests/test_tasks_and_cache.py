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
