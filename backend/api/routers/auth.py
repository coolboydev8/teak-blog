from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from ninja import Router
from ninja.errors import HttpError

from ..schemas import (
    AccessOut,
    LoginIn,
    LoginOut,
    PasswordResetConfirmIn,
    PasswordResetRequestIn,
    PasswordResetRequestOut,
    ProfileUpdateIn,
    RefreshIn,
    RegisterIn,
    RegisterOut,
    UserOut,
)
from ..security import (
    REFRESH,
    TokenError,
    create_access_token,
    decode_token,
    issue_tokens,
)

User = get_user_model()
router = Router(tags=["auth"])


@router.post("/register", response={201: RegisterOut}, auth=None)
def register(request, data: RegisterIn):
    if User.objects.filter(username=data.username).exists():
        raise HttpError(409, "Username already taken.")
    if User.objects.filter(email__iexact=data.email).exists():
        raise HttpError(409, "Email already registered.")
    try:
        validate_password(data.password)
    except ValidationError as exc:
        raise HttpError(422, " ".join(exc.messages))

    user = User.objects.create_user(
        username=data.username, email=data.email, password=data.password
    )
    return 201, {"user": user, "tokens": issue_tokens(user)}


def _authenticate(identifier: str, password: str):
    """Authenticate by username, falling back to email lookup."""
    user = authenticate(username=identifier, password=password)
    if user is None and "@" in identifier:
        match = User.objects.filter(email__iexact=identifier).first()
        if match is not None:
            user = authenticate(username=match.username, password=password)
    return user


@router.post("/login", response=LoginOut, auth=None)
def login(request, data: LoginIn):
    user = _authenticate(data.username, data.password)
    if user is None:
        raise HttpError(401, "Invalid credentials.")
    return {"user": user, **issue_tokens(user)}


@router.post("/token/refresh", response=AccessOut, auth=None)
def refresh(request, data: RefreshIn):
    try:
        payload = decode_token(data.refresh, expected_type=REFRESH)
        user = User.objects.get(id=payload["sub"], is_active=True)
    except (TokenError, User.DoesNotExist):
        raise HttpError(401, "Invalid or expired refresh token.")
    return {"access": create_access_token(user)}


@router.post("/password/reset", response=PasswordResetRequestOut, auth=None)
def request_password_reset(request, data: PasswordResetRequestIn):
    """Start a password reset. Always returns 200 (no account enumeration)."""
    result = {
        "detail": "If an account exists for that email, a reset link has been sent.",
        "reset_url": None,
    }
    user = User.objects.filter(email__iexact=data.email, is_active=True).first()
    if user is None:
        return result

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?uid={uid}&token={token}"
    send_mail(
        subject="Reset your Nordic Trust password",
        message=(
            f"We received a request to reset your password.\n\n{reset_url}\n\n"
            "If you didn't request this, you can ignore this email."
        ),
        from_email=None,
        recipient_list=[user.email],
        fail_silently=True,
    )
    if settings.DEBUG:
        result["reset_url"] = reset_url  # dev convenience only
    return result


@router.post("/password/reset/confirm", response={200: UserOut}, auth=None)
def confirm_password_reset(request, data: PasswordResetConfirmIn):
    try:
        uid = force_str(urlsafe_base64_decode(data.uid))
        user = User.objects.get(pk=uid, is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        raise HttpError(400, "Invalid or expired reset link.")

    if not default_token_generator.check_token(user, data.token):
        raise HttpError(400, "Invalid or expired reset link.")

    try:
        validate_password(data.new_password, user=user)
    except ValidationError as exc:
        raise HttpError(422, " ".join(exc.messages))

    user.set_password(data.new_password)
    user.save(update_fields=["password"])
    return user


@router.get("/me", response=UserOut)
def me(request):
    return request.auth


@router.patch("/me", response=UserOut)
def update_me(request, data: ProfileUpdateIn):
    user = request.auth
    for field, value in data.dict(exclude_unset=True).items():
        setattr(user, field, value)
    user.save()
    return user
