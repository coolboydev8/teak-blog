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

from .models import Post, Subscription

logger = logging.getLogger(__name__)

WEBHOOK_TIMEOUT = 5


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


@shared_task(
    bind=True,
    autoretry_for=(requests.RequestException,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    acks_late=True,
)
def deliver_webhook(self, url: str, payload: dict, secret: str | None = None) -> None:
    body = json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if secret:
        # HMAC-SHA256 signature, exactly like Teak's partner webhook signing.
        headers["X-Signature-256"] = f"sha256={_sign(secret, body)}"
    resp = requests.post(url, data=body, headers=headers, timeout=WEBHOOK_TIMEOUT)
    resp.raise_for_status()
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

    subscriptions = Subscription.objects.filter(author=post.author).select_related(
        "subscriber"
    )

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
    """Atomically bump a post's view counter off the hot read path."""
    Post.objects.filter(id=post_id).update(view_count=F("view_count") + 1)
