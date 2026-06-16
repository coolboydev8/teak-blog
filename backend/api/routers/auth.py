from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from ninja import Router
from ninja.errors import HttpError

from ..schemas import (
    AccessOut,
    LoginIn,
    RefreshIn,
    RegisterIn,
    RegisterOut,
    TokenPairOut,
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


@router.post("/login", response=TokenPairOut, auth=None)
def login(request, data: LoginIn):
    user = authenticate(username=data.username, password=data.password)
    if user is None:
        raise HttpError(401, "Invalid credentials.")
    return issue_tokens(user)


@router.post("/token/refresh", response=AccessOut, auth=None)
def refresh(request, data: RefreshIn):
    try:
        payload = decode_token(data.refresh, expected_type=REFRESH)
        user = User.objects.get(id=payload["sub"], is_active=True)
    except (TokenError, User.DoesNotExist):
        raise HttpError(401, "Invalid or expired refresh token.")
    return {"access": create_access_token(user)}


@router.get("/me", response=UserOut)
def me(request):
    return request.auth
