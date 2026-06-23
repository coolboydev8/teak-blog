"""
Background tasks. Side effects that should not block the request/response cycle
live here. Teak analogy: SQS + Celery background event processing.
"""
import hashlib
import hmac
import json
import logging
import random
import uuid

import requests
from celery import shared_task
from django.core.cache import cache
from django.core.mail import send_mail
from django.db.models import F
from django.utils import timezone

from .models import Post, PostView, Subscription, Webhook

logger = logging.getLogger(__name__)

# Split connect/read timeouts: a peer that accepts the TCP connection but then
# hangs must not pin a worker for long. Bounded retries with backoff + jitter.
WEBHOOK_CONNECT_TIMEOUT = 3.05
WEBHOOK_READ_TIMEOUT = 5
WEBHOOK_MAX_RETRIES = 5
# Transient HTTP responses worth retrying; every *other* 4xx is terminal.
WEBHOOK_RETRYABLE_STATUS = {429, 500, 502, 503, 504}

# Milestone detection is an author-level, slow-moving concern (thresholds start
# at 1,000 cumulative reads). Running its cross-post SUM aggregate on every view
# is wasted work at the highest-frequency event in the app, so we debounce it to
# at most once per author per window.
MILESTONE_CHECK_THROTTLE = 60  # seconds


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _set_health(webhook_id: int, status: int | None, health: str) -> None:
    Webhook.objects.filter(id=webhook_id).update(
        last_status=status, health=health, last_triggered_at=timezone.now()
    )


def emit_event(owner_id: int, event: str, payload: dict) -> None:
    """Enqueue delivery of ``event`` to all of an owner's active webhooks.

    A stable per-delivery ``event_id`` is threaded through to the receiver as the
    ``X-Webhook-Id`` header so an at-least-once redelivery (see ``acks_late`` on
    deliver_webhook) can be de-duplicated by the receiver.
    """
    for hook in Webhook.objects.filter(owner_id=owner_id, event=event, is_active=True):
        deliver_webhook.delay(
            hook.url, payload, hook.secret or None, hook.id, uuid.uuid4().hex
        )


def _retry_webhook(task, exc, webhook_id, status):
    """Retry with exponential backoff + jitter; on exhaustion flag the webhook
    FAILING (the dead-letter signal operators watch) and stop."""
    if task.request.retries < task.max_retries:
        backoff = min(2 ** task.request.retries, 60)
        countdown = backoff + random.uniform(0, backoff / 2)  # jitter avoids retry stampedes
        raise task.retry(exc=exc, countdown=countdown)
    if webhook_id:
        _set_health(webhook_id, status, Webhook.Health.FAILING)
    logger.warning(
        "Webhook delivery failed permanently after %s retries: %s", task.max_retries, exc
    )


@shared_task(bind=True, acks_late=True, max_retries=WEBHOOK_MAX_RETRIES)
def deliver_webhook(
    self,
    url: str,
    payload: dict,
    secret: str | None = None,
    webhook_id: int | None = None,
    event_id: str | None = None,
) -> None:
    """Deliver one webhook with HMAC signing, *retry classification*, and
    idempotency.

    - Transient failures — connection error, timeout, HTTP 429 / 5xx — are
      retried with backoff + jitter (the receiver may just be down or rate-limiting).
    - Terminal failures — any other 4xx (bad URL, auth, malformed payload) — are
      NOT retried; retrying only wastes a worker and hammers the receiver. The
      webhook is marked FAILING so operators can find and fix it.
    - ``acks_late=True`` means a worker crash mid-task can redeliver the message,
      so delivery must be safe to repeat: the stable ``X-Webhook-Id`` header lets
      the receiver dedupe. (Classifying *which* errors are retryable, and making
      at-least-once safe, are application decisions Celery cannot infer.)
    """
    body = json.dumps(payload).encode()
    headers = {
        "Content-Type": "application/json",
        # Stable id for receiver-side idempotency across retries/redeliveries.
        "X-Webhook-Id": event_id or self.request.id or "",
    }
    if secret:
        # HMAC-SHA256 signature, exactly like Teak's partner webhook signing.
        headers["X-Signature-256"] = f"sha256={_sign(secret, body)}"

    try:
        resp = requests.post(
            url,
            data=body,
            headers=headers,
            timeout=(WEBHOOK_CONNECT_TIMEOUT, WEBHOOK_READ_TIMEOUT),
        )
    except (requests.ConnectionError, requests.Timeout) as exc:
        # Never got a definitive answer -> transient -> retry.
        return _retry_webhook(self, exc, webhook_id, status=None)

    if resp.status_code in WEBHOOK_RETRYABLE_STATUS:
        return _retry_webhook(
            self, RuntimeError(f"HTTP {resp.status_code}"), webhook_id, status=resp.status_code
        )

    if resp.status_code >= 400:
        # Terminal client error: retrying won't help. Dead-letter it.
        if webhook_id:
            _set_health(webhook_id, resp.status_code, Webhook.Health.FAILING)
        logger.warning(
            "Webhook to %s rejected permanently: HTTP %s (no retry)", url, resp.status_code
        )
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
def increment_view_count(post_id: int, author_id: int | None = None) -> None:
    """Bump the counter, log a view event, and (throttled) check milestones.

    ``author_id`` is passed by the caller (it already has it on both the cache
    hit and miss paths) so the milestone debounce needs no extra lookup. It is
    optional for backwards-compatibility with tasks enqueued before this change.
    """
    updated = Post.objects.filter(id=post_id).update(view_count=F("view_count") + 1)
    if not updated:
        return
    PostView.objects.create(post_id=post_id)
    _maybe_check_milestones(post_id, author_id)


def _maybe_check_milestones(post_id: int, author_id: int | None) -> None:
    """Debounce the expensive milestone aggregate to once per author per window.

    ``cache.add`` is an atomic set-if-absent (Redis SETNX): only the first caller
    inside the window proceeds; every other view in that window skips the
    cross-post SUM aggregate and the per-threshold ``exists()`` checks entirely.
    Milestones are monotonic and recorded at most once, so the only effect is
    that detection can lag a crossing by up to the throttle window — fine for a
    1,000+ cumulative-read gamification signal.
    """
    if author_id is None:
        author_id = (
            Post.objects.filter(id=post_id).values_list("author_id", flat=True).first()
        )
    if author_id is None:
        return
    if cache.add(f"milestones:throttle:{author_id}", 1, MILESTONE_CHECK_THROTTLE):
        _check_milestones(author_id)


def _check_milestones(author_id: int) -> None:
    from django.db.models import Sum

    from .activity import MILESTONES, record_activity
    from .models import ActivityEvent

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
