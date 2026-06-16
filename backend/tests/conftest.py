import json

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client

from api.security import issue_tokens
from config.celery import app as celery_app

User = get_user_model()


@pytest.fixture(autouse=True)
def eager_celery(settings):
    """Run Celery tasks inline so .delay() executes synchronously in tests."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def make_user(db):
    def _make(username="alice", password="Str0ngPass!", **kwargs):
        kwargs.setdefault("email", f"{username}@example.com")
        return User.objects.create_user(username=username, password=password, **kwargs)

    return _make


class APIClient:
    """Thin wrapper over Django's test client: JSON in/out + bearer auth."""

    def __init__(self):
        self.client = Client()
        self.token = None

    def auth(self, user):
        self.token = issue_tokens(user)["access"]
        return self

    def _headers(self, extra=None):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if extra:
            headers.update(extra)
        return headers

    def get(self, url, headers=None):
        return self.client.get(url, headers=self._headers(headers))

    def post(self, url, data=None, headers=None):
        return self.client.post(
            url,
            data=json.dumps(data or {}),
            content_type="application/json",
            headers=self._headers(headers),
        )

    def put(self, url, data=None, headers=None):
        return self.client.put(
            url,
            data=json.dumps(data or {}),
            content_type="application/json",
            headers=self._headers(headers),
        )

    def delete(self, url, headers=None):
        return self.client.delete(url, headers=self._headers(headers))


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def author(make_user):
    return make_user(username="author")


@pytest.fixture
def reader(make_user):
    return make_user(username="reader")
