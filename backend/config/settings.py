"""
Django settings for the Teak-inspired blog backend.

Configuration is environment-driven (12-factor) via django-environ so the same
image runs locally, in Docker, and in CI by changing env vars only.
"""
from datetime import timedelta
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, "dev-insecure-secret-key-change-me"),
    ALLOWED_HOSTS=(list, ["*"]),
    DATABASE_URL=(str, "postgres://blog:blog@localhost:5432/blog"),
    REDIS_URL=(str, "redis://localhost:6379/0"),
    CELERY_TASK_ALWAYS_EAGER=(bool, False),
    CACHE_TTL_POST_LIST=(int, 60),
    CACHE_TTL_POST_DETAIL=(int, 120),
)

# Read a .env file if present (handy for local, no-Docker runs).
env_file = BASE_DIR / ".env"
if env_file.exists():
    env.read_env(str(env_file))

# --- Core ---------------------------------------------------------------
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# Fail fast: never run a production process on the shared dev secret.
if not DEBUG and SECRET_KEY == "dev-insecure-secret-key-change-me":
    raise ImproperlyConfigured(
        "SECRET_KEY must be set to a unique secret value when DEBUG is False."
    )

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Local apps
    "users",
    "blog",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database -----------------------------------------------------------
DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["ATOMIC_REQUESTS"] = False
DATABASES["default"].setdefault("CONN_MAX_AGE", 60)
# Revalidate persistent connections before reuse (avoids handing a request a
# dead connection after a DB restart / pooler recycle).
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
# Bound connection setup and any single statement so a slow/hung query can't pin
# a connection and cascade. statement_timeout is generous (30s) and env-tunable;
# raise DB_STATEMENT_TIMEOUT_MS if a heavy migration ever needs longer.
_db_options = DATABASES["default"].setdefault("OPTIONS", {})
_db_options.setdefault("connect_timeout", 10)
_db_statement_timeout = env.int("DB_STATEMENT_TIMEOUT_MS", default=30000)
if _db_statement_timeout > 0:
    _db_options["options"] = f"-c statement_timeout={_db_statement_timeout}"

# --- Auth ---------------------------------------------------------------
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- JWT (hand-rolled, see api/security.py) -----------------------------
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_LIFETIME = timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=30))
# The refresh token is the ABSOLUTE maximum session length (an active session can
# be renewed up to this long). The 1-hour *idle* timeout is enforced client-side
# (it slides on activity), so this only needs to be long enough not to cut off an
# active user mid-session. Default 24 hours.
JWT_REFRESH_TOKEN_LIFETIME = timedelta(hours=env.int("JWT_SESSION_HOURS", default=24))

# --- Caching (Redis) ----------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            # Degrade gracefully if Redis is unreachable: reads become a cache
            # miss served from Postgres and writes become no-ops, instead of
            # 500-ing every cached endpoint. The source of truth stays available.
            "IGNORE_EXCEPTIONS": True,
        },
        "KEY_PREFIX": "blog",
    }
}
# Log (don't swallow silently) the cache failures that IGNORE_EXCEPTIONS hides.
DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS = True
CACHE_TTL_POST_LIST = env("CACHE_TTL_POST_LIST")
CACHE_TTL_POST_DETAIL = env("CACHE_TTL_POST_DETAIL")

# --- Celery -------------------------------------------------------------
CELERY_BROKER_URL = env("REDIS_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")
CELERY_TASK_ALWAYS_EAGER = env("CELERY_TASK_ALWAYS_EAGER")
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_DEFAULT_QUEUE = "default"
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
# Reliability guards: kill runaway tasks and stop task results from bloating
# Redis. (All current tasks finish in well under a minute.)
CELERY_TASK_SOFT_TIME_LIMIT = env.int("CELERY_TASK_SOFT_TIME_LIMIT", default=100)
CELERY_TASK_TIME_LIMIT = env.int("CELERY_TASK_TIME_LIMIT", default=120)
CELERY_RESULT_EXPIRES = env.int("CELERY_RESULT_EXPIRES", default=3600)

# --- Email --------------------------------------------------------------
# Set EMAIL_HOST (+ user/password) to deliver real mail via SMTP; otherwise
# mail is printed to the console (dev). EMAIL_BACKEND can override explicitly.
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)

EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default=(
        "django.core.mail.backends.smtp.EmailBackend"
        if EMAIL_HOST
        else "django.core.mail.backends.console.EmailBackend"
    ),
)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@teak-blog.local")

# Base URL of the SPA, used to build password-reset links in emails.
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")

# --- i18n / static ------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Timestamped, leveled logging suitable for container log aggregation.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "default"},
    },
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
}
