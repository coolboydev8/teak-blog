from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from blog.activity import record_activity
from blog.models import ActivityEvent, Subscription
from blog.tasks import emit_event

from ..schemas import SubscriptionCreateIn, SubscriptionOut, SubscriptionUpdateIn

User = get_user_model()
router = Router(tags=["subscriptions"])


@router.post("/", response={201: SubscriptionOut, 200: SubscriptionOut})
def subscribe(request, data: SubscriptionCreateIn):
    if data.author_id == request.auth.id:
        raise HttpError(422, "You cannot subscribe to yourself.")
    if data.notification_method == Subscription.Method.WEBHOOK and not data.webhook_url:
        raise HttpError(422, "webhook_url is required for webhook subscriptions.")

    author = get_object_or_404(User, id=data.author_id)
    sub, created = Subscription.objects.get_or_create(
        subscriber=request.auth,
        author=author,
        defaults={
            "notification_method": data.notification_method,
            "frequency": data.frequency,
            "webhook_url": data.webhook_url,
            "webhook_secret": data.webhook_secret,
        },
    )
    if created:
        emit_event(
            author.id,
            "user.subscribed",
            {
                "event": "user.subscribed",
                "subscriber": request.auth.username,
                "author": author.username,
            },
        )
        record_activity(
            author.id,
            ActivityEvent.Type.SUBSCRIBER,
            f"{request.auth.username} subscribed to you",
            "",
            {"subscriber": request.auth.username},
        )
    return (201 if created else 200), sub


@router.patch("/{int:sub_id}", response=SubscriptionOut)
def update_subscription(request, sub_id: int, data: SubscriptionUpdateIn):
    """Pause/resume or change delivery frequency of a subscription."""
    sub = get_object_or_404(Subscription, id=sub_id, subscriber=request.auth)
    for field, value in data.dict(exclude_unset=True).items():
        setattr(sub, field, value)
    sub.save()
    return sub


@router.delete("/{int:sub_id}", response={204: None})
def unsubscribe(request, sub_id: int):
    sub = get_object_or_404(Subscription, id=sub_id, subscriber=request.auth)
    sub.delete()
    return 204, None
