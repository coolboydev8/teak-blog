import pytest

from blog.models import Subscription

pytestmark = pytest.mark.django_db


def test_subscribe_and_list(api, author, reader):
    resp = api.auth(reader).post("/api/subscriptions/", {"author_id": author.id})
    assert resp.status_code == 201
    listing = api.get("/api/me/subscriptions").json()
    assert len(listing) == 1
    assert listing[0]["author"]["username"] == "author"


def test_cannot_subscribe_to_self(api, author):
    resp = api.auth(author).post("/api/subscriptions/", {"author_id": author.id})
    assert resp.status_code == 422


def test_duplicate_subscribe_is_idempotent(api, author, reader):
    api.auth(reader)
    first = api.post("/api/subscriptions/", {"author_id": author.id})
    second = api.post("/api/subscriptions/", {"author_id": author.id})
    assert first.status_code == 201
    assert second.status_code == 200
    assert Subscription.objects.count() == 1


def test_unsubscribe(api, author, reader):
    sub_id = api.auth(reader).post(
        "/api/subscriptions/", {"author_id": author.id}
    ).json()["id"]
    assert api.delete(f"/api/subscriptions/{sub_id}").status_code == 204
    assert Subscription.objects.count() == 0


def test_webhook_requires_url(api, author, reader):
    resp = api.auth(reader).post(
        "/api/subscriptions/",
        {"author_id": author.id, "notification_method": "webhook"},
    )
    assert resp.status_code == 422
