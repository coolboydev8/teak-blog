"""NinjaAPI assembly: auth, routers, health probes, and error handling."""
import logging

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from ninja import NinjaAPI

from blog.services import ServiceError

from .auth import JWTAuth
from .routers.auth import router as auth_router
from .routers.comments import router as comments_router
from .routers.me import router as me_router
from .routers.posts import router as posts_router
from .routers.subscriptions import router as subscriptions_router
from .routers.taxonomy import router as taxonomy_router
from .routers.webhooks import router as webhooks_router

logger = logging.getLogger(__name__)

api = NinjaAPI(
    title="Teak Blog API",
    version="1.0.0",
    description="A small, Teak-inspired blogging backend (Django Ninja).",
    auth=JWTAuth(),  # default: endpoints require a Bearer access token...
)


@api.exception_handler(ServiceError)
def handle_service_error(request, exc: ServiceError):
    # Map domain rule violations to clean JSON 4xx responses.
    return api.create_response(request, {"detail": exc.message}, status=exc.status)


# Last-resort handler so an unhandled exception returns a clean JSON 500 (and is
# logged) instead of a bare text/plain stack trace. Registered only when DEBUG is
# off so the rich traceback page is preserved in development. Ninja's specific
# handlers (HttpError, validation, ServiceError) still take precedence.
if not settings.DEBUG:

    @api.exception_handler(Exception)
    def handle_unexpected_error(request, exc: Exception):
        logger.exception("Unhandled API error")
        return api.create_response(
            request, {"detail": "Internal server error."}, status=500
        )


@api.get("/healthz", auth=None, include_in_schema=False)
def healthz(request):
    """Liveness: the process is up. No external dependencies are checked."""
    return {"status": "ok"}


@api.get("/readyz", auth=None, include_in_schema=False)
def readyz(request):
    """Readiness: can we actually serve traffic? Checks DB and cache."""
    checks = {"database": False, "cache": False}
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        checks["database"] = True
    except Exception:
        logger.warning("readyz: database check failed", exc_info=True)
    try:
        cache.set("readyz:probe", "1", 5)
        checks["cache"] = cache.get("readyz:probe") == "1"
    except Exception:
        logger.warning("readyz: cache check failed", exc_info=True)
    healthy = all(checks.values())
    return api.create_response(
        request,
        {"status": "ok" if healthy else "degraded", "checks": checks},
        status=200 if healthy else 503,
    )


api.add_router("/auth", auth_router)
api.add_router("/posts", posts_router)
api.add_router("/subscriptions", subscriptions_router)
api.add_router("/webhooks", webhooks_router)
api.add_router("/me", me_router)
# Comment + taxonomy routes carry their own full paths.
api.add_router("", comments_router)
api.add_router("", taxonomy_router)
