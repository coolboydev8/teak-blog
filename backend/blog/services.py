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


def _resolve_tags(tag_ids: list[int] | None) -> list[Tag]:
    if not tag_ids:
        return []
    tags = list(Tag.objects.filter(id__in=tag_ids))
    found = {t.id for t in tags}
    missing = set(tag_ids) - found
    if missing:
        raise ServiceError(f"Unknown tag id(s): {sorted(missing)}", status=422)
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
        slug=generate_unique_slug(data["title"]),
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
    if "category_id" in data:
        post.category = _resolve_category(data["category_id"])

    post.save()

    if "tags" in data and data["tags"] is not None:
        post.tags.set(_resolve_tags(data["tags"]))

    invalidate_posts()
    return post


@transaction.atomic
def publish_post(*, post: Post) -> Post:
    """Validate and transition a post to published, then fan out notifications."""
    if post.status == Post.Status.ARCHIVED:
        raise ServiceError("Archived posts cannot be published.", status=409)
    if not post.content.strip():
        raise ServiceError("Cannot publish a post with empty content.", status=422)

    already_published = post.status == Post.Status.PUBLISHED
    post.status = Post.Status.PUBLISHED
    if post.published_at is None:
        post.published_at = timezone.now()
    post.save(update_fields=["status", "published_at", "updated_at"])
    invalidate_posts()

    # Fire side effects only on the draft -> published transition, and only
    # after the surrounding transaction commits (avoids notifying on rollback).
    if not already_published:
        from .tasks import notify_subscribers

        transaction.on_commit(lambda: notify_subscribers.delay(post.id))

    return post


@transaction.atomic
def archive_post(*, post: Post) -> Post:
    post.status = Post.Status.ARCHIVED
    post.save(update_fields=["status", "updated_at"])
    invalidate_posts()
    return post


def delete_post(*, post: Post) -> None:
    if post.status != Post.Status.DRAFT:
        raise ServiceError("Only draft posts can be deleted.", status=409)
    post.delete()
    invalidate_posts()
