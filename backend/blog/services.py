"""
Business logic for the blog domain.

Keeping the state-transition logic (publish/archive/delete), slug generation,
idempotency and revision bookkeeping here — rather than in the API layer —
keeps routers thin and makes the rules unit-testable and reusable (e.g. from
the admin, a management command, or a future GraphQL layer).
"""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.text import slugify

from .cache import invalidate_posts
from .models import Category, IdempotencyKey, Post, PostRevision, Tag


class ServiceError(Exception):
    """Raised on a domain rule violation; mapped to HTTP 4xx by the API."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def generate_unique_slug(title: str, instance: Post | None = None) -> str:
    base = slugify(title)[:200] or "post"
    slug = base
    n = 2
    qs = Post.objects.all()
    if instance is not None and instance.pk:
        qs = qs.exclude(pk=instance.pk)
    while qs.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


def _derive_excerpt(content: str, limit: int = 200) -> str:
    text = " ".join(content.split())
    return text[:limit].rstrip()


def _resolve_tags(values: list | None) -> list[Tag]:
    """Resolve tags given as ids (int) or names/slugs (str, get-or-created)."""
    if not values:
        return []
    tags = []
    for value in values:
        if isinstance(value, int) or (isinstance(value, str) and value.strip().isdigit()):
            try:
                tags.append(Tag.objects.get(id=int(value)))
            except Tag.DoesNotExist:
                raise ServiceError(f"Unknown tag id: {value}", status=422)
        else:
            name = str(value).strip()
            if not name:
                continue
            tag, _ = Tag.objects.get_or_create(
                slug=slugify(name), defaults={"name": name}
            )
            tags.append(tag)
    return tags


def _resolve_category(category_id: int | None) -> Category | None:
    if category_id is None:
        return None
    try:
        return Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        raise ServiceError(f"Unknown category id: {category_id}", status=422)


@transaction.atomic
def create_post(*, author, data: dict, idempotency_key: str | None = None) -> Post:
    """Create a draft post.

    If an idempotency key is supplied, replaying it returns the originally
    created post instead of creating a duplicate (safe under client retries).
    """
    if idempotency_key:
        existing = (
            IdempotencyKey.objects.select_related("post")
            .filter(user=author, key=idempotency_key)
            .first()
        )
        if existing and existing.post_id:
            return existing.post

    category = _resolve_category(data.get("category_id"))
    tags = _resolve_tags(data.get("tags"))

    post = Post(
        title=data["title"],
        slug=generate_unique_slug(data.get("slug") or data["title"]),
        content=data["content"],
        excerpt=data.get("excerpt") or _derive_excerpt(data["content"]),
        author=author,
        category=category,
        metadata=data.get("metadata") or {},
    )
    post.save()
    if tags:
        post.tags.set(tags)

    if idempotency_key:
        try:
            IdempotencyKey.objects.create(user=author, key=idempotency_key, post=post)
        except IntegrityError:
            # Concurrent request with the same key won the race; return its post.
            existing = (
                IdempotencyKey.objects.select_related("post")
                .get(user=author, key=idempotency_key)
            )
            if existing.post_id and existing.post_id != post.id:
                transaction.set_rollback(True)
                return existing.post

    invalidate_posts()
    return post


@transaction.atomic
def update_post(*, post: Post, data: dict, editor) -> Post:
    """Apply a partial update, snapshotting the previous version first."""
    # Snapshot the current state before mutating (audit trail).
    PostRevision.objects.create(
        post=post,
        title=post.title,
        content=post.content,
        metadata=post.metadata,
        edited_by=editor,
    )

    if "title" in data and data["title"] is not None:
        post.title = data["title"]
    if "content" in data and data["content"] is not None:
        post.content = data["content"]
    if "excerpt" in data and data["excerpt"] is not None:
        post.excerpt = data["excerpt"]
    if "metadata" in data and data["metadata"] is not None:
        post.metadata = data["metadata"]
    if data.get("slug"):
        post.slug = generate_unique_slug(data["slug"], instance=post)
    if "category_id" in data:
        post.category = _resolve_category(data["category_id"])

    post.save()

    if "tags" in data and data["tags"] is not None:
        post.tags.set(_resolve_tags(data["tags"]))

    invalidate_posts()
    return post


@transaction.atomic
def publish_post(*, post: Post) -> Post:
    """Transition a post to published and fan out notifications — *exactly once*.

    Business invariant: only one actor may move a post from draft to published
    and trigger the subscriber/webhook fan-out, even under two concurrent publish
    requests (or a redelivered Celery job). A read-then-write
    (``if status == DRAFT: save()``) does NOT enforce this — two transactions can
    both read DRAFT and both notify. We instead *claim* the transition with a
    single conditional UPDATE that only matches a row still in DRAFT; exactly one
    caller gets ``claimed == 1`` and fires the side effects. (For a transition
    that must mutate several related rows atomically we'd reach for
    ``select_for_update()`` instead — here one conditional UPDATE is enough and
    avoids holding a row lock.)

    The fan-out is scheduled with ``transaction.on_commit`` so it never runs
    against an uncommitted/rolled-back row — the publish→Celery race in which a
    fast worker reads a row the producing transaction hasn't committed yet.
    """
    if not post.content.strip():
        raise ServiceError("Cannot publish a post with empty content.", status=422)
    if post.status == Post.Status.ARCHIVED:
        raise ServiceError("Archived posts cannot be published.", status=409)

    now = timezone.now()
    claimed = (
        Post.objects.filter(id=post.id, status=Post.Status.DRAFT).update(
            status=Post.Status.PUBLISHED, published_at=now, updated_at=now
        )
    )
    invalidate_posts()

    if not claimed:
        # Lost the race / already published / no longer a draft: do NOT re-notify.
        post.refresh_from_db()
        return post

    # We are the sole winner of the transition — reflect it on the in-memory
    # instance and fire the one-time fan-out after the transaction commits.
    post.status = Post.Status.PUBLISHED
    post.published_at = now

    from .activity import record_activity
    from .models import ActivityEvent
    from .tasks import emit_event, notify_subscribers

    def _fire():
        notify_subscribers.delay(post.id)
        emit_event(
            post.author_id,
            "post.published",
            {
                "event": "post.published",
                "post": {"id": post.id, "slug": post.slug, "title": post.title},
                "author": post.author.username,
            },
        )
        record_activity(
            post.author_id,
            ActivityEvent.Type.PUBLISH,
            post.title,
            post.excerpt,
            {"slug": post.slug},
        )

    transaction.on_commit(_fire)
    return post


@transaction.atomic
def archive_post(*, post: Post) -> Post:
    post.status = Post.Status.ARCHIVED
    post.save(update_fields=["status", "updated_at"])
    invalidate_posts()
    return post


@transaction.atomic
def unpublish_post(*, post: Post) -> Post:
    """Move a post back to draft, removing it from public listings.

    The reverse of publish: clears ``published_at`` so a later re-publish stamps
    a fresh date and a true draft never carries a publication time.
    """
    post.status = Post.Status.DRAFT
    post.published_at = None
    post.save(update_fields=["status", "published_at", "updated_at"])
    invalidate_posts()
    return post


def delete_post(*, post: Post) -> None:
    if post.status != Post.Status.DRAFT:
        raise ServiceError("Only draft posts can be deleted.", status=409)
    post.delete()
    invalidate_posts()
