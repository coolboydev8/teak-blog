"""NinjaAPI assembly: auth, routers, and domain-error handling."""
from ninja import NinjaAPI

from blog.services import ServiceError

from .auth import JWTAuth
from .routers.auth import router as auth_router
from .routers.comments import router as comments_router
from .routers.me import router as me_router
from .routers.posts import router as posts_router
from .routers.subscriptions import router as subscriptions_router

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


api.add_router("/auth", auth_router)
api.add_router("/posts", posts_router)
api.add_router("/subscriptions", subscriptions_router)
api.add_router("/me", me_router)
# Comment routes carry their own full paths (/posts/{slug}/comments, /comments/...).
api.add_router("", comments_router)
