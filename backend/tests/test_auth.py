import pytest

pytestmark = pytest.mark.django_db


def test_register_returns_user_and_tokens(api):
    resp = api.post(
        "/api/auth/register",
        {"username": "newbie", "email": "newbie@example.com", "password": "Str0ngPass!"},
    )
    assert resp.status_code == 201, resp.content
    body = resp.json()
    assert body["user"]["username"] == "newbie"
    assert body["tokens"]["access"] and body["tokens"]["refresh"]


def test_register_rejects_duplicate_username(api, make_user):
    make_user(username="taken")
    resp = api.post(
        "/api/auth/register",
        {"username": "taken", "email": "other@example.com", "password": "Str0ngPass!"},
    )
    assert resp.status_code == 409


def test_register_rejects_weak_password(api):
    resp = api.post(
        "/api/auth/register",
        {"username": "weak", "email": "weak@example.com", "password": "123"},
    )
    assert resp.status_code == 422


def test_login_and_me(api, make_user):
    make_user(username="bob", password="Str0ngPass!")
    resp = api.post("/api/auth/login", {"username": "bob", "password": "Str0ngPass!"})
    assert resp.status_code == 200
    access = resp.json()["access"]

    me = api.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    assert me.json()["username"] == "bob"


def test_login_invalid_credentials(api, make_user):
    make_user(username="carol")
    resp = api.post("/api/auth/login", {"username": "carol", "password": "wrong"})
    assert resp.status_code == 401


def test_refresh_issues_new_access(api, make_user):
    make_user(username="dave", password="Str0ngPass!")
    tokens = api.post(
        "/api/auth/login", {"username": "dave", "password": "Str0ngPass!"}
    ).json()
    resp = api.post("/api/auth/token/refresh", {"refresh": tokens["refresh"]})
    assert resp.status_code == 200
    assert "access" in resp.json()


def test_protected_endpoint_requires_auth(api):
    assert api.get("/api/auth/me").status_code == 401
    assert api.get("/api/me/posts").status_code == 401
