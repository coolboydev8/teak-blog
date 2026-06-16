"""Ninja authentication: a Bearer scheme backed by our JWT access tokens."""
from django.contrib.auth import get_user_model
from ninja.security import HttpBearer

from .security import ACCESS, TokenError, decode_token

User = get_user_model()


class JWTAuth(HttpBearer):
    """Validates `Authorization: Bearer <access_token>` and loads the user.

    On success the resolved user is returned (and exposed as ``request.auth``
    by Ninja) and also attached to ``request.user`` for convenience.
    """

    def authenticate(self, request, token):
        try:
            payload = decode_token(token, expected_type=ACCESS)
        except TokenError:
            return None

        try:
            user = User.objects.get(id=payload["sub"], is_active=True)
        except (User.DoesNotExist, KeyError, ValueError):
            return None

        request.user = user
        return user


def get_optional_user(request):
    """Resolve the user from a Bearer token if present, else return None.

    Used by public read endpoints that behave slightly differently for the
    owning author (e.g. an author may view their own unpublished post and see
    all comment statuses) without making auth mandatory.
    """
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    token = header[7:].strip()
    try:
        payload = decode_token(token, expected_type=ACCESS)
        return User.objects.get(id=payload["sub"], is_active=True)
    except (TokenError, User.DoesNotExist, KeyError, ValueError):
        return None
