"""Helpers for turning model instances into cache-safe, JSON-ready dicts."""
from __future__ import annotations


def serialize_many(schema, items) -> list[dict]:
    return [schema.from_orm(obj).dict() for obj in items]


def paged_response(schema, page_data: dict) -> dict:
    return {
        "count": page_data["count"],
        "next": page_data["next"],
        "previous": page_data["previous"],
        "results": serialize_many(schema, page_data["items"]),
    }
