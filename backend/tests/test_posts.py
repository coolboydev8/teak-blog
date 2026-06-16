import pytest

from blog.models import Post, PostRevision

pytestmark = pytest.mark.django_db


def _create_post(api, title="Hello World", content="Some body content here."):
    return api.post("/api/posts/", {"title": title, "content": content})


def test_create_requires_auth(api):
    assert _create_post(api).status_code == 401


def test_create_draft_and_autogenerate_slug(api, author):
    resp = _create_post(api.auth(author), title="My First Post")
    assert resp.status_code == 201, resp.content
    body = resp.json()
    assert body["slug"] == "my-first-post"
    assert body["status"] == "draft"
    assert body["excerpt"]  # auto-derived from content
    assert body["read_time_minutes"] >= 1


def test_slug_uniqueness_is_enforced(api, author):
    api.auth(author)
    first = _create_post(api, title="Same Title").json()
    second = _create_post(api, title="Same Title").json()
    assert first["slug"] == "same-title"
    assert second["slug"] == "same-title-2"


def test_draft_hidden_from_public_list_until_published(api, author):
    api.auth(author)
    slug = _create_post(api, title="Draft Post").json()["slug"]

    # Anonymous list excludes drafts.
    public = api.client.get("/api/posts/").json()
    assert public["count"] == 0

    # Owner can preview their own draft detail.
    preview = api.get(f"/api/posts/{slug}")
    assert preview.status_code == 200

    # Anonymous cannot see the draft detail.
    assert api.client.get(f"/api/posts/{slug}").status_code == 404

    # After publishing it shows up publicly.
    assert api.post(f"/api/posts/{slug}/publish").status_code == 200
    public = api.client.get("/api/posts/").json()
    assert public["count"] == 1
    assert public["results"][0]["slug"] == slug


def test_publish_sets_published_at_once(api, author):
    api.auth(author)
    slug = _create_post(api).json()["slug"]
    first = api.post(f"/api/posts/{slug}/publish").json()
    assert first["published_at"] is not None
    # Re-publishing keeps the original timestamp.
    second = api.post(f"/api/posts/{slug}/publish").json()
    assert second["published_at"] == first["published_at"]


def test_update_creates_revision(api, author):
    api.auth(author)
    slug = _create_post(api, content="original").json()["slug"]
    resp = api.put(f"/api/posts/{slug}", {"content": "updated body"})
    assert resp.status_code == 200
    assert resp.json()["content"] == "updated body"
    assert PostRevision.objects.filter(post__slug=slug).count() == 1


def test_only_owner_can_edit(api, author, reader):
    slug = _create_post(api.auth(author)).json()["slug"]
    resp = api.auth(reader).put(f"/api/posts/{slug}", {"title": "Hijacked"})
    assert resp.status_code == 403


def test_archive_removes_from_public_list(api, author):
    api.auth(author)
    slug = _create_post(api).json()["slug"]
    api.post(f"/api/posts/{slug}/publish")
    assert api.client.get("/api/posts/").json()["count"] == 1

    assert api.post(f"/api/posts/{slug}/archive").status_code == 200
    assert api.client.get("/api/posts/").json()["count"] == 0


def test_only_draft_posts_can_be_deleted(api, author):
    api.auth(author)
    slug = _create_post(api).json()["slug"]
    api.post(f"/api/posts/{slug}/publish")
    # Published cannot be deleted.
    assert api.delete(f"/api/posts/{slug}").status_code == 409

    other = _create_post(api, title="Draft to delete").json()["slug"]
    assert api.delete(f"/api/posts/{other}").status_code == 204
    assert not Post.objects.filter(slug=other).exists()


def test_idempotency_key_prevents_duplicate(api, author):
    api.auth(author)
    headers = {"Idempotency-Key": "abc-123"}
    first = api.post(
        "/api/posts/", {"title": "Idem", "content": "body"}, headers=headers
    )
    second = api.post(
        "/api/posts/", {"title": "Idem", "content": "body"}, headers=headers
    )
    assert first.json()["id"] == second.json()["id"]
    assert Post.objects.filter(author=author).count() == 1


def test_list_filters_by_category_and_search(api, author):
    from blog.models import Category

    cat = Category.objects.create(name="Engineering")
    api.auth(author)
    slug = api.post(
        "/api/posts/",
        {"title": "Postgres Tips", "content": "scaling databases", "category_id": cat.id},
    ).json()["slug"]
    api.post(f"/api/posts/{slug}/publish")
    api.post(f"/api/posts/{_create_post(api, title='Unrelated').json()['slug']}/publish")

    by_cat = api.client.get("/api/posts/?category=engineering").json()
    assert {p["slug"] for p in by_cat["results"]} == {slug}

    by_search = api.client.get("/api/posts/?search=postgres").json()
    assert {p["slug"] for p in by_search["results"]} == {slug}


def test_me_posts_lists_all_statuses(api, author):
    api.auth(author)
    _create_post(api, title="Draft One")
    published = _create_post(api, title="Pub One").json()["slug"]
    api.post(f"/api/posts/{published}/publish")

    resp = api.get("/api/me/posts")
    assert resp.status_code == 200
    assert resp.json()["count"] == 2
