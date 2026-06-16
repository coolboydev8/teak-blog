"""Small page-number pagination helper returning a DRF-style envelope."""
from __future__ import annotations

from urllib.parse import urlencode

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20


def _page_url(request, page: int, page_size: int) -> str:
    query = request.GET.copy()
    query["page"] = page
    query["page_size"] = page_size
    return request.build_absolute_uri(f"{request.path}?{urlencode(query, doseq=True)}")


def paginate(request, queryset, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE):
    """Return ``{count, next, previous, items}`` for ``queryset``.

    ``items`` is the raw model slice; the caller serializes it with a schema.
    """
    page = max(page, 1)
    page_size = min(max(page_size, 1), MAX_PAGE_SIZE)

    count = queryset.count()
    start = (page - 1) * page_size
    items = list(queryset[start : start + page_size])

    has_next = start + page_size < count
    has_prev = page > 1
    return {
        "count": count,
        "next": _page_url(request, page + 1, page_size) if has_next else None,
        "previous": _page_url(request, page - 1, page_size) if has_prev else None,
        "items": items,
    }
