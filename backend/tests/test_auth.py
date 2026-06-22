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


def test_password_reset_flow(api, make_user):
    import re

    from django.core import mail

    make_user(username="resetme", password="Str0ngPass!", email="resetme@example.com")

    resp = api.post("/api/auth/password/reset", {"email": "resetme@example.com"})
    assert resp.status_code == 200
    assert len(mail.outbox) == 1

    match = re.search(r"uid=([^&\s]+)&token=([^&\s]+)", mail.outbox[0].body)
    assert match, "reset email should contain a uid/token link"
    uid, token = match.group(1), match.group(2)

    confirm = api.post(
        "/api/auth/password/reset/confirm",
        {"uid": uid, "token": token, "new_password": "BrandNewP@ss1"},
    )
    assert confirm.status_code == 200

    # Old password is dead, new one works.
    assert api.post("/api/auth/login", {"username": "resetme", "password": "Str0ngPass!"}).status_code == 401
    assert api.post("/api/auth/login", {"username": "resetme", "password": "BrandNewP@ss1"}).status_code == 200


def test_password_reset_unknown_email_is_generic(api):
    resp = api.post("/api/auth/password/reset", {"email": "nobody@example.com"})
    assert resp.status_code == 200  # no account enumeration
    assert resp.json()["reset_url"] is None


def test_profile_update_changes_username(api, make_user):
    user = make_user(username="oldname", password="Str0ngPass!")
    api.auth(user)
    resp = api.patch("/api/auth/me", {"username": "newname"})
    assert resp.status_code == 200, resp.content
    assert resp.json()["username"] == "newname"
    user.refresh_from_db()
    assert user.username == "newname"


def test_profile_update_rejects_taken_username(api, make_user):
    make_user(username="existing")
    user = make_user(username="changer", password="Str0ngPass!")
    api.auth(user)
    resp = api.patch("/api/auth/me", {"username": "existing"})
    assert resp.status_code == 409


def test_profile_update_rejects_blank_username(api, make_user):
    user = make_user(username="keepme", password="Str0ngPass!")
    api.auth(user)
    resp = api.patch("/api/auth/me", {"username": "   "})
    assert resp.status_code == 422
    user.refresh_from_db()
    assert user.username == "keepme"


def test_profile_update_same_username_is_ok(api, make_user):
    """Re-submitting the unchanged username must not trip the uniqueness check."""
    user = make_user(username="stable", password="Str0ngPass!")
    api.auth(user)
    resp = api.patch("/api/auth/me", {"username": "stable", "title": "Writer"})
    assert resp.status_code == 200, resp.content
    assert resp.json()["title"] == "Writer"


def test_profile_update_rejects_overlong_title(api, make_user):
    """Overlong fields must be a clean 422, not a 500 (varchar overflow)."""
    user = make_user(username="longtitle", password="Str0ngPass!")
    api.auth(user)
    resp = api.patch("/api/auth/me", {"title": "x" * 200})
    assert resp.status_code == 422
    user.refresh_from_db()
    assert user.title == ""  # unchanged


def test_password_change_success(api, make_user):
    user = make_user(username="pwchanger", password="Str0ngPass!")
    api.auth(user)
    resp = api.patch(
        "/api/auth/me",
        {"current_password": "Str0ngPass!", "new_password": "BrandNewP@ss1"},
    )
    assert resp.status_code == 200, resp.content
    # Old password is dead, new one works.
    assert api.post("/api/auth/login", {"username": "pwchanger", "password": "Str0ngPass!"}).status_code == 401
    assert api.post("/api/auth/login", {"username": "pwchanger", "password": "BrandNewP@ss1"}).status_code == 200


def test_password_change_wrong_current(api, make_user):
    user = make_user(username="pwwrong", password="Str0ngPass!")
    api.auth(user)
    resp = api.patch(
        "/api/auth/me",
        {"current_password": "nope", "new_password": "BrandNewP@ss1"},
    )
    assert resp.status_code == 400
    user.refresh_from_db()
    assert user.check_password("Str0ngPass!")  # unchanged


def test_password_change_rejects_weak(api, make_user):
    user = make_user(username="pwweak", password="Str0ngPass!")
    api.auth(user)
    resp = api.patch(
        "/api/auth/me",
        {"current_password": "Str0ngPass!", "new_password": "123"},
    )
    assert resp.status_code == 422
    user.refresh_from_db()
    assert user.check_password("Str0ngPass!")  # unchanged


def test_profile_update_accepts_data_url_avatar(api, make_user):
    """Uploaded avatars arrive as long base64 data URLs; must not be length-capped."""
    user = make_user(username="avataruser", password="Str0ngPass!")
    api.auth(user)
    data_url = "data:image/png;base64," + ("A" * 5000)
    resp = api.patch("/api/auth/me", {"avatar": data_url})
    assert resp.status_code == 200, resp.content
    assert resp.json()["avatar"] == data_url


def test_password_reset_rejects_bad_token(api, make_user):
    from django.contrib.auth import get_user_model
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    user = make_user(username="reset2", email="reset2@example.com")
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    resp = api.post(
        "/api/auth/password/reset/confirm",
        {"uid": uid, "token": "bad-token", "new_password": "BrandNewP@ss1"},
    )
    assert resp.status_code == 400
