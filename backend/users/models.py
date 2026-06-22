from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model.

    We keep ``username`` as the login identifier (per the auth design) but make
    ``email`` unique so it can be used for notifications and future API-key /
    magic-link flows. Swapping a custom user model in from day one is cheap;
    retrofitting one later is painful, so we do it up front even though the
    extra profile fields are minimal.
    """

    email = models.EmailField(unique=True)

    bio = models.TextField(blank=True)
    # Holds either a hosted URL or a self-contained data URL (base64 upload),
    # so it must not be length-capped like URLField (max_length=200).
    avatar = models.TextField(blank=True)
    website = models.URLField(blank=True)
    # Editorial profile shown on author surfaces (e.g. "Lead Technical Writer",
    # domain "Distributed Architecture").
    title = models.CharField(max_length=120, blank=True)
    domain = models.CharField(max_length=120, blank=True)

    def __str__(self) -> str:
        return self.username
