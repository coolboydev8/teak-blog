import pytest

from blog.models import Comment, Post

pytestmark = pytest.mark.django_db


@pytest.fixture
def published_slug(api, author):
    slug = api.auth(author).post(
        "/api/posts/", {"title": "Open Post", "content": "discuss"}
    ).json()["slug"]
    api.post(f"/api/posts/{slug}/publish")
    return slug


def test_comment_is_approved_on_creation(api, author, reader, published_slug):
    """At this stage every comment is auto-approved on creation and immediately
    public. (The pending/rejected statuses remain in the model for a future
    moderation workflow.)"""
    resp = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "Great post!"}
    )
    assert resp.status_code == 201
    assert resp.json()["moderation_status"] == "approved"

    # Immediately visible to everyone, including anonymous visitors.
    public = api.client.get(f"/api/posts/{published_slug}/comments").json()
    assert public["count"] == 1


def test_commenter_sees_their_own_pending_comment(api, author, reader, published_slug):
    """Long-term moderation rule still holds: a signed-in commenter sees their
    own pending comment while anonymous visitors do not. (Seeded directly since
    the current create flow auto-approves.)"""
    post = Post.objects.get(slug=published_slug)
    Comment.objects.create(
        post=post,
        author=reader,
        body="held for review",
        moderation_status=Comment.Moderation.PENDING,
    )

    mine = api.auth(reader).get(f"/api/posts/{published_slug}/comments").json()
    assert mine["count"] == 1
    assert mine["results"][0]["moderation_status"] == "pending"

    # Anonymous (no token) still sees nothing until it's approved.
    public = api.client.get(f"/api/posts/{published_slug}/comments").json()
    assert public["count"] == 0


def test_author_comment_is_auto_approved(api, author, published_slug):
    resp = api.auth(author).post(
        f"/api/posts/{published_slug}/comments", {"body": "Author note"}
    )
    assert resp.json()["moderation_status"] == "approved"
    public = api.client.get(f"/api/posts/{published_slug}/comments").json()
    assert public["count"] == 1


def test_moderation_approve_makes_comment_public(api, author, reader, published_slug):
    # Seed a pending comment directly (the create flow currently auto-approves)
    # to exercise the pending -> approved moderation transition.
    post = Post.objects.get(slug=published_slug)
    comment = Comment.objects.create(
        post=post,
        author=reader,
        body="Pending one",
        moderation_status=Comment.Moderation.PENDING,
    )
    assert api.client.get(f"/api/posts/{published_slug}/comments").json()["count"] == 0

    resp = api.auth(author).put(
        f"/api/comments/{comment.uuid}/moderate", {"status": "approved"}
    )
    assert resp.status_code == 200
    assert api.client.get(f"/api/posts/{published_slug}/comments").json()["count"] == 1


def test_author_can_edit_own_comment(api, author, reader, published_slug):
    comment_uuid = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "original text"}
    ).json()["uuid"]

    resp = api.auth(reader).put(f"/api/comments/{comment_uuid}", {"body": "edited text"})
    assert resp.status_code == 200
    assert resp.json()["body"] == "edited text"
    assert Comment.objects.get(uuid=comment_uuid).body == "edited text"


def test_cannot_edit_someone_elses_comment(api, author, reader, published_slug):
    comment_uuid = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "reader's words"}
    ).json()["uuid"]

    resp = api.auth(author).put(f"/api/comments/{comment_uuid}", {"body": "hijacked"})
    assert resp.status_code == 403
    assert Comment.objects.get(uuid=comment_uuid).body == "reader's words"


def test_only_post_author_can_moderate(api, author, reader, published_slug):
    comment_uuid = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "x"}
    ).json()["uuid"]
    resp = api.auth(reader).put(
        f"/api/comments/{comment_uuid}/moderate", {"status": "approved"}
    )
    assert resp.status_code == 403


def test_invalid_moderation_status_rejected(api, author, reader, published_slug):
    comment_uuid = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "x"}
    ).json()["uuid"]
    resp = api.auth(author).put(
        f"/api/comments/{comment_uuid}/moderate", {"status": "banana"}
    )
    assert resp.status_code == 422


def test_cannot_comment_on_unpublished_post(api, author, reader):
    slug = api.auth(author).post(
        "/api/posts/", {"title": "Draft", "content": "x"}
    ).json()["slug"]
    resp = api.auth(reader).post(f"/api/posts/{slug}/comments", {"body": "hi"})
    assert resp.status_code == 403
    assert Comment.objects.count() == 0
