"""Pydantic (Ninja) schemas — the typed request/response contract."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Union
from uuid import UUID

from ninja import Field, Schema


# --- Auth ---------------------------------------------------------------
class RegisterIn(Schema):
    username: str
    email: str
    password: str


class LoginIn(Schema):
    username: str
    password: str


class TokenPairOut(Schema):
    access: str
    refresh: str


class RefreshIn(Schema):
    refresh: str


class AccessOut(Schema):
    access: str


# --- Users --------------------------------------------------------------
class AuthorOut(Schema):
    id: int
    uuid: UUID
    username: str
    avatar: str = ""
    title: str = ""
    domain: str = ""


class UserOut(Schema):
    id: int
    uuid: UUID
    username: str
    email: str
    bio: str = ""
    avatar: str = ""
    website: str = ""
    title: str = ""
    domain: str = ""
    date_joined: datetime


class ProfileUpdateIn(Schema):
    # max_length mirrors the model columns so an overlong value returns a clean
    # 422 instead of a 500 (Postgres rejects varchar overflow at write time).
    username: Optional[str] = Field(None, max_length=150)
    bio: Optional[str] = None
    avatar: Optional[str] = None
    website: Optional[str] = Field(None, max_length=200)
    title: Optional[str] = Field(None, max_length=120)
    domain: Optional[str] = Field(None, max_length=120)
    # Password change: both required together; verified against the stored hash.
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class RegisterOut(Schema):
    user: UserOut
    tokens: TokenPairOut


class LoginOut(Schema):
    user: UserOut
    access: str
    refresh: str


class PasswordResetRequestIn(Schema):
    email: str


class PasswordResetRequestOut(Schema):
    detail: str
    reset_url: Optional[str] = None  # populated only in DEBUG, for dev convenience


class PasswordResetConfirmIn(Schema):
    uid: str
    token: str
    new_password: str


# --- Taxonomy -----------------------------------------------------------
class CategoryOut(Schema):
    id: int
    uuid: UUID
    name: str
    slug: str


class TagOut(Schema):
    id: int
    uuid: UUID
    name: str
    slug: str


# --- Posts --------------------------------------------------------------
# Tags may be given as ids (int) or names/slugs (str, get-or-created).
TagInput = list[Union[int, str]]


class PostCreateIn(Schema):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    excerpt: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[TagInput] = None
    metadata: Optional[dict] = None


class PostUpdateIn(Schema):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    excerpt: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[TagInput] = None
    metadata: Optional[dict] = None


class PostListItemOut(Schema):
    id: int
    uuid: UUID
    slug: str
    title: str
    excerpt: str
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    view_count: int
    comment_count: int = 0  # annotated by PostQuerySet.with_related()
    read_time_minutes: int  # sourced from Post.read_time_minutes property
    author: AuthorOut
    category: Optional[CategoryOut]
    tags: list[TagOut]


class PostDetailOut(PostListItemOut):
    content: str
    metadata: dict


# --- Comments -----------------------------------------------------------
class CommentCreateIn(Schema):
    body: str = Field(..., min_length=1)


class CommentModerateIn(Schema):
    status: str  # "approved" | "rejected"
    reason: str = ""


class CommentOut(Schema):
    id: int
    uuid: UUID
    body: str
    moderation_status: str
    created_at: datetime
    author: AuthorOut


class PostRefOut(Schema):
    slug: str
    title: str


class CommentModerationOut(Schema):
    """Comment enriched with its parent post, for the author moderation queue."""

    id: int
    uuid: UUID
    body: str
    moderation_status: str
    moderation_reason: str = ""
    created_at: datetime
    author: AuthorOut
    post: PostRefOut


# --- Subscriptions ------------------------------------------------------
class SubscriptionCreateIn(Schema):
    author_id: int
    notification_method: str = "email"
    frequency: str = "realtime"
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None


class SubscriptionUpdateIn(Schema):
    frequency: Optional[str] = None
    is_active: Optional[bool] = None


class SubscriptionOut(Schema):
    id: int
    uuid: UUID
    notification_method: str
    frequency: str
    is_active: bool
    created_at: datetime
    author: AuthorOut


# --- Webhooks ("Callback Workflows") ------------------------------------
class WebhookCreateIn(Schema):
    event: str
    url: str
    secret: str = ""
    is_active: bool = True


class WebhookUpdateIn(Schema):
    event: Optional[str] = None
    url: Optional[str] = None
    secret: Optional[str] = None
    is_active: Optional[bool] = None


class WebhookOut(Schema):
    id: int
    uuid: UUID
    event: str
    url: str
    is_active: bool
    health: str
    last_status: Optional[int]
    last_triggered_at: Optional[datetime]
    created_at: datetime
    # secret is intentionally write-only; we expose only a masked hint.
    secret_set: bool

    @staticmethod
    def resolve_secret_set(obj) -> bool:
        return bool(obj.secret)


# --- Misc ---------------------------------------------------------------
class RevisionOut(Schema):
    id: int
    uuid: UUID
    title: str
    created_at: datetime
    edited_by: Optional[AuthorOut]


class MessageOut(Schema):
    detail: str


class PagedPosts(Schema):
    count: int
    next: Optional[str]
    previous: Optional[str]
    results: list[PostListItemOut]


class PagedComments(Schema):
    count: int
    next: Optional[str]
    previous: Optional[str]
    results: list[CommentOut]


class PagedModerationComments(Schema):
    count: int
    next: Optional[str]
    previous: Optional[str]
    results: list[CommentModerationOut]


# --- Analytics ----------------------------------------------------------
class ReachBucket(Schema):
    label: str
    pct: int


class ActivityOut(Schema):
    id: int
    uuid: UUID
    type: str
    title: str
    body: str = ""
    metadata: dict
    is_read: bool
    created_at: datetime


class PagedActivity(Schema):
    count: int
    next: Optional[str]
    previous: Optional[str]
    results: list[ActivityOut]


class UnreadOut(Schema):
    unread: int


class AnalyticsOut(Schema):
    total_views: int
    total_posts: int
    published_posts: int
    draft_posts: int
    subscriber_count: int
    total_comments: int
    pending_comments: int
    views_delta_pct: float
    subscribers_delta_pct: float
    trust_score: float
    # Per-signal point contributions to trust_score (transparency + extensibility).
    trust_breakdown: dict[str, float] = {}
    # Leaderboard position among authors (replaces the old hardcoded "#04").
    rank: int = 0
    rank_total: int = 0
    rank_percentile: int = 0
    # Weekly view "Momentum" trend; reuses the {label, pct} bucket shape.
    audience_reach: list[ReachBucket]
    momentum_delta_pct: float = 0.0
