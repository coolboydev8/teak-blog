from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from blog.models import Webhook

from ..schemas import WebhookCreateIn, WebhookOut, WebhookUpdateIn

router = Router(tags=["webhooks"])

VALID_EVENTS = set(Webhook.Event.values)


@router.get("/", response=list[WebhookOut])
def list_webhooks(request):
    return list(Webhook.objects.filter(owner=request.auth))


@router.post("/", response={201: WebhookOut})
def create_webhook(request, data: WebhookCreateIn):
    if data.event not in VALID_EVENTS:
        raise HttpError(422, f"event must be one of {sorted(VALID_EVENTS)}.")
    hook = Webhook.objects.create(
        owner=request.auth,
        event=data.event,
        url=data.url,
        secret=data.secret,
        is_active=data.is_active,
    )
    return 201, hook


@router.patch("/{int:webhook_id}", response=WebhookOut)
def update_webhook(request, webhook_id: int, data: WebhookUpdateIn):
    hook = get_object_or_404(Webhook, id=webhook_id, owner=request.auth)
    payload = data.dict(exclude_unset=True)
    if "event" in payload and payload["event"] not in VALID_EVENTS:
        raise HttpError(422, f"event must be one of {sorted(VALID_EVENTS)}.")
    for field, value in payload.items():
        setattr(hook, field, value)
    # Re-arm health when the endpoint is reconfigured.
    if {"url", "event", "secret"} & payload.keys():
        hook.health = Webhook.Health.AWAITING
    hook.save()
    return hook


@router.delete("/{int:webhook_id}", response={204: None})
def delete_webhook(request, webhook_id: int):
    hook = get_object_or_404(Webhook, id=webhook_id, owner=request.auth)
    hook.delete()
    return 204, None
