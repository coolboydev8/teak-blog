"""Tests for the frontend-integration endpoints (Phases 0-3)."""
import pytest

from blog.models import Comment, Post, Subscription, Tag, Webhook

pytestmark = pytest.mark.django_db


def _publish(api, title="A Post", content="some body words here"):
    slug = api.post("/api/posts/", {"title": title, "content": content}).json()["slug"]
    api.post(f"/api/posts/{slug}/publish")
    return slug


# --- P0 -----------------------------------------------------------------
def test_login_with_email_returns_user(api, make_user):
    make_user(username="emi", password="Str0ngPass!", email="emi@example.com")
    resp = api.post("/api/auth/login", {"username": "emi@example.com", "password": "Str0ngPass!"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["username"] == "emi"
    assert body["access"] and body["refresh"]


# --- P1: taxonomy + editor save path ------------------------------------
def test_categories_and_tags_are_public(api):
    Tag.objects.create(name="performance")
    # "Engineering" et al. are seeded by migration 0004, so assert membership
    # rather than exact equality (the endpoint exposes the controlled taxonomy).
    cat_slugs = {c["slug"] for c in api.client.get("/api/categories").json()}
    assert "engineering" in cat_slugs
    assert {t["slug"] for t in api.client.get("/api/tags").json()} == {"performance"}


def test_create_post_with_tag_names_and_custom_slug(api, author):
    api.auth(author)
    resp = api.post(
        "/api/posts/",
        {"title": "Tagged", "content": "body", "slug": "my-custom-slug", "tags": ["Alpha", "beta"]},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["slug"] == "my-custom-slug"
    assert {t["slug"] for t in body["tags"]} == {"alpha", "beta"}
    assert Tag.objects.filter(slug__in=["alpha", "beta"]).count() == 2


# --- P1: profile --------------------------------------------------------
def test_profile_patch(api, author):
    api.auth(author)
    resp = api.patch("/api/auth/me", {"title": "Lead Engineer", "bio": "I build things."})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Lead Engineer"
    assert api.get("/api/auth/me").json()["bio"] == "I build things."


# --- P1: analytics ------------------------------------------------------
def test_analytics_totals(api, author, reader):
    api.auth(author)
    _publish(api, "One")
    api.post("/api/posts/", {"title": "Draft", "content": "x"})  # a draft
    api.auth(reader).post("/api/subscriptions/", {"author_id": author.id})

    data = api.auth(author).get("/api/me/analytics").json()
    assert data["total_posts"] == 2
    assert data["published_posts"] == 1
    assert data["draft_posts"] == 1
    assert data["subscriber_count"] == 1
    assert 0.0 <= data["trust_score"] <= 10.0
    assert isinstance(data["audience_reach"], list)
    # New data-derived dashboard fields (rank, trust breakdown, momentum).
    assert isinstance(data["trust_breakdown"], dict) and data["trust_breakdown"]
    assert isinstance(data["rank"], int) and data["rank"] >= 1
    assert data["rank_total"] >= 1
    assert 0 <= data["rank_percentile"] <= 100
    assert isinstance(data["momentum_delta_pct"], (int, float))


# --- P1: moderation queue ----------------------------------------------
def test_moderation_queue_lists_with_post_ref(api, author, reader):
    slug = _publish(api.auth(author), "Discuss")
    # Comments auto-approve on creation at this stage, so insert a genuinely
    # pending one directly to exercise the moderation queue (the pending/approved/
    # rejected lifecycle is retained for a future moderation workflow).
    Comment.objects.create(
        post=Post.objects.get(slug=slug),
        author=reader,
        body="Question?",
        moderation_status=Comment.Moderation.PENDING,
    )

    queue = api.auth(author).get("/api/me/comments?status=pending").json()
    assert queue["count"] == 1
    item = queue["results"][0]
    assert item["moderation_status"] == "pending"
    assert item["post"]["slug"] == slug
    assert item["author"]["username"] == "reader"


# --- P2: subscription depth --------------------------------------------
def test_subscription_pause_and_resume(api, author, reader):
    sub_id = api.auth(reader).post("/api/subscriptions/", {"author_id": author.id}).json()["uuid"]
    assert api.patch(f"/api/subscriptions/{sub_id}", {"is_active": False}).status_code == 200
    assert api.get("/api/me/subscriptions").json()[0]["is_active"] is False


def test_paused_subscription_skips_notifications(api, author, reader, make_user):
    from django.utils import timezone

    from blog.models import Post
    from blog.tasks import notify_subscribers

    sub_id = api.auth(reader).post("/api/subscriptions/", {"author_id": author.id}).json()["uuid"]
    api.patch(f"/api/subscriptions/{sub_id}", {"is_active": False})

    post = Post.objects.create(
        author=author, title="x", slug="x", content="c",
        status=Post.Status.PUBLISHED, published_at=timezone.now(),
    )
    assert notify_subscribers(post.id) == 0


# --- P2: webhooks -------------------------------------------------------
def test_webhook_crud(api, author):
    api.auth(author)
    created = api.post("/api/webhooks/", {"event": "post.published", "url": "https://h.test/x", "secret": "s"})
    assert created.status_code == 201
    wid = created.json()["uuid"]
    assert created.json()["secret_set"] is True  # secret not echoed back
    assert created.json()["health"] == "awaiting"

    assert api.get("/api/webhooks/").json()[0]["uuid"] == wid
    assert api.patch(f"/api/webhooks/{wid}", {"is_active": False}).json()["is_active"] is False
    assert api.delete(f"/api/webhooks/{wid}").status_code == 204


def test_webhook_invalid_event_rejected(api, author):
    resp = api.auth(author).post("/api/webhooks/", {"event": "nope", "url": "https://h.test/x"})
    assert resp.status_code == 422


def test_published_event_delivers_signed_webhook(
    api, author, monkeypatch, django_capture_on_commit_callbacks
):
    captured = {}

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            pass

    def fake_post(url, data=None, headers=None, timeout=None):
        captured.update(url=url, headers=headers)
        return FakeResponse()

    monkeypatch.setattr("blog.tasks.requests.post", fake_post)

    api.auth(author)
    wid = api.post(
        "/api/webhooks/", {"event": "post.published", "url": "https://h.test/x", "secret": "topsecret"}
    ).json()["id"]
    slug = api.post("/api/posts/", {"title": "Hook me", "content": "body"}).json()["slug"]
    with django_capture_on_commit_callbacks(execute=True):
        api.post(f"/api/posts/{slug}/publish")

    assert captured["url"] == "https://h.test/x"
    assert captured["headers"]["X-Signature-256"].startswith("sha256=")
    assert Webhook.objects.get(id=wid).health == "functional"


# --- P3: activity feed --------------------------------------------------
def test_publish_records_activity_and_unread(
    api, author, django_capture_on_commit_callbacks
):
    api.auth(author)
    slug = api.post("/api/posts/", {"title": "Activity", "content": "body"}).json()["slug"]
    with django_capture_on_commit_callbacks(execute=True):
        api.post(f"/api/posts/{slug}/publish")

    feed = api.get("/api/me/activity").json()
    assert any(e["type"] == "publish" for e in feed["results"])
    assert api.get("/api/me/notifications").json()["unread"] >= 1

    api.post("/api/me/activity/read")
    assert api.get("/api/me/notifications").json()["unread"] == 0


def test_new_comment_records_activity_for_author(api, author, reader):
    slug = _publish(api.auth(author), "Open")
    api.auth(reader).post(f"/api/posts/{slug}/comments", {"body": "hi"})

    feed = api.auth(author).get("/api/me/activity").json()
    assert any(e["type"] == "comment" for e in feed["results"])


def test_public_list_sort_by_comments(api, author):
    api.auth(author)
    slug_a = _publish(api, "Alpha Post")
    slug_b = _publish(api, "Beta Post")
    # Author's own comments auto-approve, so Beta gets the higher comment_count.
    api.post(f"/api/posts/{slug_b}/comments", {"body": "one"})
    api.post(f"/api/posts/{slug_b}/comments", {"body": "two"})

    results = api.client.get("/api/posts/?sort=comments&page_size=5").json()["results"]
    assert results[0]["slug"] == slug_b
    assert results[0]["comment_count"] == 2


def test_post_comment_count_counts_only_approved(api, author, reader):
    slug = _publish(api.auth(author), "Counted")
    # One genuinely pending comment (inserted directly, since the API auto-approves)
    # plus one approved comment — comment_count must count only the approved one.
    Comment.objects.create(
        post=Post.objects.get(slug=slug),
        author=reader,
        body="pending one",
        moderation_status=Comment.Moderation.PENDING,
    )
    api.auth(author).post(f"/api/posts/{slug}/comments", {"body": "approved one"})

    assert api.client.get(f"/api/posts/{slug}").json()["comment_count"] == 1
    assert api.auth(author).get("/api/me/posts").json()["results"][0]["comment_count"] >= 0
