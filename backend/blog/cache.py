"""
Cache-aside helpers for the high-read post endpoints.

Strategy: a single monotonically increasing *version* number is embedded in
every post cache key. Any write (create/update/publish/archive/delete) bumps
the version, which atomically invalidates every cached list and detail entry
without us having to track the (unbounded) set of query-string permutations.
This mirrors Teak's versioned config-cache invalidation.
"""
import hashlib
import json

from django.core.cache import cache

POSTS_VERSION_KEY = "posts:version"


def get_posts_version() -> int:
    version = cache.get(POSTS_VERSION_KEY)
    if version is None:
        # Persist with no TTL so it survives until the next bump.
        cache.set(POSTS_VERSION_KEY, 1, None)
        return 1
    return version


def invalidate_posts() -> int:
    """Bump the version, invalidating all cached list/detail responses."""
    try:
        return cache.incr(POSTS_VERSION_KEY)
    except ValueError:
        # Key missing/expired — (re)initialise it.
        cache.set(POSTS_VERSION_KEY, 1, None)
        return 1


def hash_query(params: dict) -> str:
    """Stable short hash of normalized query params for list cache keys."""
    blob = json.dumps(params, sort_keys=True, default=str)
    return hashlib.sha1(blob.encode()).hexdigest()[:16]


def post_list_key(params: dict) -> str:
    return f"posts:list:v{get_posts_version()}:{hash_query(params)}"


def post_detail_key(slug: str) -> str:
    return f"posts:detail:v{get_posts_version()}:{slug}"
