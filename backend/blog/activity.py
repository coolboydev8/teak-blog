"""Helpers for recording activity-feed / notification events."""
from __future__ import annotations

from .models import ActivityEvent

# Cumulative-read milestones that emit a dashboard event when crossed.
MILESTONES = [1000, 10000, 50000, 100000, 500000, 1000000]


def record_activity(user_id, type, title, body="", metadata=None) -> ActivityEvent:
    return ActivityEvent.objects.create(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        metadata=metadata or {},
    )
