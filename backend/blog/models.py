import math

from django.conf import settings
from django.db import models
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True, blank=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class PostQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status=Post.Status.PUBLISHED)

    def with_related(self):
        """Eager-load everything the API serializers touch (avoids N+1).

        ``comment_count`` is a single grouped aggregate over the
        (post, moderation_status) index — one query, no per-row lookups.
        """
        return (
            self.select_related("author", "category")
            .prefetch_related("tags")
            .annotate(
                comment_count=models.Count(
                    "comments",
                    filter=models.Q(comments__moderation_status="approved"),
                    distinct=True,
                )
            )
        )


class Post(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    content = models.TextField()
    excerpt = models.TextField(blank=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="posts")

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    published_at = models.DateTimeField(null=True, blank=True)

    # Flexible per-post config: SEO overrides, experiment variants, display
    # settings. Mirrors Teak's partner/product config blob — lets product
    # behaviour change without a schema migration.
    metadata = models.JSONField(default=dict, blank=True)

    view_count = models.PositiveBigIntegerField(default=0)

    objects = PostQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            # Public list path filters by status and orders by published_at.
            models.Index(fields=["status", "-published_at"]),
            # Author dashboard lists own posts newest-first.
            models.Index(fields=["author", "-created_at"]),
        ]

    @property
    def read_time_minutes(self) -> int:
        """Rough reading time at ~200 words/minute (min 1)."""
        return max(1, math.ceil(len(self.content.split()) / 200))

    def __str__(self) -> str:
        return self.title


class Comment(TimeStampedModel):
    class Moderation(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    body = models.TextField()

    moderation_status = models.CharField(
        max_length=20,
        choices=Moderation.choices,
        default=Moderation.PENDING,
    )
    moderation_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["post", "moderation_status"]),
        ]

    def __str__(self) -> str:
        return f"Comment #{self.pk} on {self.post_id}"


class Subscription(models.Model):
    """A reader following an author. Delivery can be email or webhook.

    The webhook fields (url + secret + HMAC signing in the task) mirror Teak's
    partner webhook subscription model.
    """

    class Method(models.TextChoices):
        EMAIL = "email", "Email"
        WEBHOOK = "webhook", "Webhook"

    class Frequency(models.TextChoices):
        REALTIME = "realtime", "Real-time"
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    subscriber = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscribers",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    notification_method = models.CharField(
        max_length=20,
        choices=Method.choices,
        default=Method.EMAIL,
    )
    frequency = models.CharField(
        max_length=20,
        choices=Frequency.choices,
        default=Frequency.REALTIME,
    )
    # Paused subscriptions stay in the list but receive no notifications.
    is_active = models.BooleanField(default=True)
    webhook_url = models.URLField(blank=True, null=True)
    webhook_secret = models.CharField(max_length=256, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["subscriber", "author"], name="unique_subscription"
            ),
            # A reader cannot subscribe to themselves.
            models.CheckConstraint(
                condition=~models.Q(subscriber=models.F("author")),
                name="no_self_subscription",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.subscriber_id} -> {self.author_id}"


class PostRevision(models.Model):
    """Immutable snapshot of a post's content, written on each edit.

    Provides an audit trail / change history (Teak analogy: order/policy change
    log) and a foundation for future diff/restore features.
    """

    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    metadata = models.JSONField(default=dict)

    edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Revision of {self.post_id} @ {self.created_at:%Y-%m-%d %H:%M}"


class IdempotencyKey(models.Model):
    """Stores the result of an idempotent write so retries return the original.

    Teak analogy: quote/order idempotency token — replaying the same key under
    load returns the first result instead of creating a duplicate.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="idempotency_keys",
    )
    key = models.CharField(max_length=255)
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        null=True,
        related_name="idempotency_keys",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "key"], name="unique_idempotency_key_per_user"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.key}"


class PostView(models.Model):
    """One row per detail view (written async), enabling real view trends.

    The denormalized ``Post.view_count`` stays the hot-path counter; this log
    is the time-series behind dashboard deltas and milestones.
    """

    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, related_name="views"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["post", "created_at"])]


class ActivityEvent(models.Model):
    """An item in an author's activity timeline / notification feed."""

    class Type(models.TextChoices):
        PUBLISH = "publish", "Publish event"
        COMMENT = "comment", "New comment"
        COMMENT_APPROVED = "comment_approved", "Comment approved"
        MILESTONE = "milestone", "Milestone"
        SUBSCRIBER = "subscriber", "New subscriber"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity",
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.type} for {self.user_id}"


class Webhook(models.Model):
    """A user-configured event callback ("Callback Workflow").

    Teak analogy: partner webhook registration — an owner registers a URL for an
    event type, payloads are HMAC-signed with ``secret`` and delivered with
    retry; ``health`` reflects the last delivery outcome.
    """

    class Event(models.TextChoices):
        POST_PUBLISHED = "post.published", "Post published"
        COMMENT_CREATED = "comment.created", "Comment created"
        USER_SUBSCRIBED = "user.subscribed", "User subscribed"

    class Health(models.TextChoices):
        AWAITING = "awaiting", "Awaiting first delivery"
        FUNCTIONAL = "functional", "Functional"
        FAILING = "failing", "Failing"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="webhooks",
    )
    event = models.CharField(max_length=40, choices=Event.choices)
    url = models.URLField()
    secret = models.CharField(max_length=256, blank=True)
    is_active = models.BooleanField(default=True)

    health = models.CharField(
        max_length=20, choices=Health.choices, default=Health.AWAITING
    )
    last_status = models.PositiveIntegerField(null=True, blank=True)
    last_triggered_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["owner", "event", "is_active"])]

    def __str__(self) -> str:
        return f"{self.owner_id}:{self.event} -> {self.url}"
