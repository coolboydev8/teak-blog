"""Pydantic (Ninja) schemas — the typed request/response contract."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

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
    username: str
    avatar: str = ""


class UserOut(Schema):
    id: int
    username: str
    email: str
    bio: str = ""
    avatar: str = ""
    website: str = ""


class RegisterOut(Schema):
    user: UserOut
    tokens: TokenPairOut


# --- Taxonomy -----------------------------------------------------------
class CategoryOut(Schema):
    id: int
    name: str
    slug: str


class TagOut(Schema):
    id: int
    name: str
    slug: str


# --- Posts --------------------------------------------------------------
class PostCreateIn(Schema):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    excerpt: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[list[int]] = None
    metadata: Optional[dict] = None


class PostUpdateIn(Schema):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    excerpt: Optional[str] = None
    category_id: Optional[int] = None
    tags: Optional[list[int]] = None
    metadata: Optional[dict] = None


class PostListItemOut(Schema):
    id: int
    slug: str
    title: str
    excerpt: str
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    view_count: int
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
    body: str
    moderation_status: str
    created_at: datetime
    author: AuthorOut


# --- Subscriptions ------------------------------------------------------
class SubscriptionCreateIn(Schema):
    author_id: int
    notification_method: str = "email"
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None


class SubscriptionOut(Schema):
    id: int
    notification_method: str
    created_at: datetime
    author: AuthorOut


# --- Misc ---------------------------------------------------------------
class RevisionOut(Schema):
    id: int
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
