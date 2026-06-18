"""
Background tasks. Side effects that should not block the request/response cycle
live here. Teak analogy: SQS + Celery background event processing.
"""
import hashlib
import hmac
import json
import logging

import requests
from celery import shared_task
from django.core.mail import send_mail
from django.db.models import F
from django.utils import timezone

from .models import Post, PostView, Subscription, Webhook

logger = logging.getLogger(__name__)

WEBHOOK_TIMEOUT = 5


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _set_health(webhook_id: int, status: int | None, health: str) -> None:
    Webhook.objects.filter(id=webhook_id).update(
        last_status=status, health=health, last_triggered_at=timezone.now()
    )


def emit_event(owner_id: int, event: str, payload: dict) -> None:
    """Enqueue delivery of ``event`` to all of an owner's active webhooks."""
    for hook in Webhook.objects.filter(owner_id=owner_id, event=event, is_active=True):
        deliver_webhook.delay(hook.url, payload, hook.secret or None, hook.id)


@shared_task(bind=True, acks_late=True, max_retries=3)
def deliver_webhook(
    self, url: str, payload: dict, secret: str | None = None, webhook_id: int | None = None
) -> None:
    body = json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if secret:
        # HMAC-SHA256 signature, exactly like Teak's partner webhook signing.
        headers["X-Signature-256"] = f"sha256={_sign(secret, body)}"
    try:
        resp = requests.post(url, data=body, headers=headers, timeout=WEBHOOK_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as exc:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries)
        if webhook_id:
            _set_health(webhook_id, None, Webhook.Health.FAILING)
        logger.warning("Webhook delivery to %s failed permanently: %s", url, exc)
        return
    if webhook_id:
        _set_health(webhook_id, resp.status_code, Webhook.Health.FUNCTIONAL)
    logger.info("Webhook delivered to %s (%s)", url, resp.status_code)


@shared_task
def notify_subscribers(post_id: int) -> int:
    """Fan out 'new post published' notifications to an author's subscribers.

    Returns the number of subscribers notified (useful for tests/observability).
    """
    try:
        post = Post.objects.select_related("author").get(id=post_id)
    except Post.DoesNotExist:
        logger.warning("notify_subscribers: post %s no longer exists", post_id)
        return 0

    subscriptions = Subscription.objects.filter(
        author=post.author, is_active=True
    ).select_related("subscriber")

    count = 0
    for sub in subscriptions:
        payload = {
            "event": "post.published",
            "post": {
                "id": post.id,
                "slug": post.slug,
                "title": post.title,
                "author": post.author.username,
                "published_at": post.published_at.isoformat()
                if post.published_at
                else None,
            },
        }
        if sub.notification_method == Subscription.Method.WEBHOOK and sub.webhook_url:
            deliver_webhook.delay(sub.webhook_url, payload, sub.webhook_secret)
        else:
            send_mail(
                subject=f"New post from {post.author.username}: {post.title}",
                message=f"{post.title}\n\nRead it: /posts/{post.slug}",
                from_email=None,  # uses DEFAULT_FROM_EMAIL
                recipient_list=[sub.subscriber.email],
                fail_silently=True,
            )
        count += 1

    logger.info("notify_subscribers: notified %s subscriber(s) of post %s", count, post_id)
    return count


@shared_task
def increment_view_count(post_id: int) -> None:
    """Bump the counter, log a view event, and check reading milestones."""
    updated = Post.objects.filter(id=post_id).update(view_count=F("view_count") + 1)
    if not updated:
        return
    PostView.objects.create(post_id=post_id)
    _check_milestones(post_id)


def _check_milestones(post_id: int) -> None:
    from django.db.models import Sum

    from .activity import MILESTONES, record_activity
    from .models import ActivityEvent

    row = Post.objects.filter(id=post_id).values("author_id").first()
    if not row:
        return
    author_id = row["author_id"]
    total = (
        Post.objects.filter(author_id=author_id).aggregate(s=Sum("view_count"))["s"] or 0
    )
    for threshold in MILESTONES:
        if total < threshold:
            break
        already = ActivityEvent.objects.filter(
            user_id=author_id,
            type=ActivityEvent.Type.MILESTONE,
            metadata__threshold=threshold,
        ).exists()
        if not already:
            record_activity(
                author_id,
                ActivityEvent.Type.MILESTONE,
                f"{threshold:,} Total Reads",
                f"Your publication crossed {threshold:,} cumulative reads.",
                {"threshold": threshold},
            )
