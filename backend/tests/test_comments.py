import pytest

from blog.models import Comment

pytestmark = pytest.mark.django_db


@pytest.fixture
def published_slug(api, author):
    slug = api.auth(author).post(
        "/api/posts/", {"title": "Open Post", "content": "discuss"}
    ).json()["slug"]
    api.post(f"/api/posts/{slug}/publish")
    return slug


def test_comment_starts_pending_and_hidden_from_public(api, author, reader, published_slug):
    resp = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "Great post!"}
    )
    assert resp.status_code == 201
    assert resp.json()["moderation_status"] == "pending"

    # Public list hides pending comments.
    public = api.client.get(f"/api/posts/{published_slug}/comments").json()
    assert public["count"] == 0

    # The post author sees all statuses.
    owner_view = api.auth(author).get(f"/api/posts/{published_slug}/comments").json()
    assert owner_view["count"] == 1


def test_author_comment_is_auto_approved(api, author, published_slug):
    resp = api.auth(author).post(
        f"/api/posts/{published_slug}/comments", {"body": "Author note"}
    )
    assert resp.json()["moderation_status"] == "approved"
    public = api.client.get(f"/api/posts/{published_slug}/comments").json()
    assert public["count"] == 1


def test_moderation_approve_makes_comment_public(api, author, reader, published_slug):
    comment_id = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "Pending one"}
    ).json()["id"]

    resp = api.auth(author).put(
        f"/api/comments/{comment_id}/moderate", {"status": "approved"}
    )
    assert resp.status_code == 200
    assert api.client.get(f"/api/posts/{published_slug}/comments").json()["count"] == 1


def test_only_post_author_can_moderate(api, author, reader, published_slug):
    comment_id = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "x"}
    ).json()["id"]
    resp = api.auth(reader).put(
        f"/api/comments/{comment_id}/moderate", {"status": "approved"}
    )
    assert resp.status_code == 403


def test_invalid_moderation_status_rejected(api, author, reader, published_slug):
    comment_id = api.auth(reader).post(
        f"/api/posts/{published_slug}/comments", {"body": "x"}
    ).json()["id"]
    resp = api.auth(author).put(
        f"/api/comments/{comment_id}/moderate", {"status": "banana"}
    )
    assert resp.status_code == 422


def test_cannot_comment_on_unpublished_post(api, author, reader):
    slug = api.auth(author).post(
        "/api/posts/", {"title": "Draft", "content": "x"}
    ).json()["slug"]
    resp = api.auth(reader).post(f"/api/posts/{slug}/comments", {"body": "hi"})
    assert resp.status_code == 403
    assert Comment.objects.count() == 0
