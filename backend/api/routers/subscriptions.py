from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from blog.models import Subscription

from ..schemas import SubscriptionCreateIn, SubscriptionOut

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
            "webhook_url": data.webhook_url,
            "webhook_secret": data.webhook_secret,
        },
    )
    return (201 if created else 200), sub


@router.delete("/{int:sub_id}", response={204: None})
def unsubscribe(request, sub_id: int):
    sub = get_object_or_404(Subscription, id=sub_id, subscriber=request.auth)
    sub.delete()
    return 204, None
