"""
Minimal JWT implementation (access + refresh) built directly on PyJWT.

Rationale: the only other moving part in this stack that needs DRF is token
auth. Rather than pull DRF + simplejwt in just for that, we issue/verify HS256
tokens ourselves in ~40 lines. It is transparent, easy to reason about in a
review, and avoids coupling a Ninja API to DRF. For production you'd likely
move to asymmetric keys (RS256) and a rotation/blacklist story.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import jwt
from django.conf import settings

ACCESS = "access"
REFRESH = "refresh"


class TokenError(Exception):
    pass


def _encode(
    user_id: int, token_type: str, lifetime, *, max_exp: datetime | None = None
) -> str:
    now = datetime.now(timezone.utc)
    exp = now + lifetime
    # Never let a token outlive an explicit ceiling (the session deadline).
    if max_exp is not None and max_exp < exp:
        exp = max_exp
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "iat": now,
        "exp": exp,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user, *, not_after: datetime | None = None) -> str:
    return _encode(
        user.id, ACCESS, settings.JWT_ACCESS_TOKEN_LIFETIME, max_exp=not_after
    )


def create_refresh_token(user) -> str:
    return _encode(user.id, REFRESH, settings.JWT_REFRESH_TOKEN_LIFETIME)


def issue_tokens(user) -> dict:
    return {
        "access": create_access_token(user),
        "refresh": create_refresh_token(user),
    }


def decode_token(token: str, expected_type: str | None = None) -> dict:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Invalid token.") from exc

    if expected_type and payload.get("type") != expected_type:
        raise TokenError(f"Expected a {expected_type} token.")
    return payload
