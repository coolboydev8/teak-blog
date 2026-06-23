# Performance deep-dive: the post-view hot path

**Scope.** Views are the highest-frequency event in any content app: every page
load of a published post hits `GET /posts/{slug}`. If anything degrades first
under load, it is the read path and the write work it triggers. This note records
what I examined, what I ruled out, the change I made, the tradeoffs, how I'd
monitor it, and what I'd do next.

---

## What I examined

The full chain for one post view:

```
GET /posts/{slug}                       (api/routers/posts.py: get_post)
  ├─ cache.get(post_detail_key)         versioned cache-aside (blog/cache.py)
  │   ├─ HIT  → increment_view_count.delay(...)  → return cached dict
  │   └─ MISS → DB read (.with_related) → cache.set → increment_view_count.delay(...)
  └─ increment_view_count (Celery task, blog/tasks.py)
       ├─ UPDATE posts SET view_count = view_count + 1 WHERE id = ?   (atomic F())
       ├─ INSERT INTO blog_postview (...)                            (one row / view)
       └─ _check_milestones(...)
            ├─ SELECT author_id FROM posts WHERE id = ?
            ├─ SELECT SUM(view_count) FROM posts WHERE author_id = ?  ← cross-post aggregate
            └─ for each of 6 thresholds: SELECT EXISTS(... metadata__threshold = ?)
```

I read: `posts.py` (`get_post`), `blog/tasks.py` (`increment_view_count`,
`_check_milestones`, `notify_subscribers`, `deliver_webhook`), `blog/cache.py`,
`blog/analytics.py` (consumes `PostView` + `view_count`), `blog/services.py`
(write side / cache invalidation), and `test_tasks_and_cache.py`.

---

## What I ruled out

- **Stale detail cache after an edit.** I suspected `update_post` might invalidate
  the list cache but not the per-slug detail cache. It doesn't: `blog/cache.py`
  embeds a single monotonic `posts:version` in *every* list and detail key, and
  any write bumps it via `cache.incr`, atomically invalidating both. Verified by
  `test_publish_invalidates_stale_list_cache`. Good design — no change needed.
- **N+1 in the list/detail serializers.** `PostQuerySet.with_related()` does
  `select_related("author","category") + prefetch_related("tags")` and computes
  `comment_count` as a single filtered aggregate. No per-row fan-out.
- **The publish fan-out.** `notify_subscribers` / `emit_event` are already off the
  request thread (Celery), fired on `transaction.on_commit`, and webhook delivery
  retries with backoff. That path is sound; it is also low-frequency (publishes ≪
  views), so it is not where load bites first.

---

## Findings, ranked by what degrades first

**F1 — `_check_milestones` runs a cross-post `SUM(view_count)` aggregate on
*every* view.** This is the headline issue. Milestones fire at 1k/10k/50k/100k/
500k/1M *cumulative author reads* — at most six times in an author's lifetime —
yet the detection query ran on every single view. At `V` views/sec for an author,
that is `V` aggregates/sec over *all* their posts, plus up to six
`metadata__threshold` `exists()` checks (a JSON lookup, see F3). ~99.999% of that
work can never find anything new. This is pure waste at the hottest frequency.

**F2 — one Celery message + one row-locking `UPDATE` + one `PostView` INSERT per
view** (including cache hits — `increment_view_count.delay` runs on the HIT path
too, which is correct: cached views should still count). At scale this means:
broker (Redis) message pressure proportional to raw traffic; write contention on
a single hot `Post` row (every increment locks it — the atomic `F()` keeps the
txn short, but a viral post still serializes its increments); and unbounded
`blog_postview` growth (one row per view, forever).

**F3 — `metadata__threshold=<n>` is an unindexed JSONField lookup** on
`ActivityEvent`. Cheap while the table is small, but it scans, and it ran inside
the per-view path (F1). Throttling F1 mostly removes the exposure; a partial index
would be the targeted fix if milestone events ever grow large.

---

## The change in this PR

I targeted **F1**, the highest cost-to-benefit item, with the smallest correct
change and no new infrastructure (there is no Celery **beat** scheduler in this
project yet — see Next steps).

1. **Debounce the milestone aggregate to once per author per 60s window** using
   `cache.add(key, 1, ttl)` — an atomic Redis `SETNX`. Only the first view in the
   window runs the SUM + `exists()` loop; every other view skips milestone work
   entirely. (`blog/tasks.py: _maybe_check_milestones`.)
2. **Pass `author_id` into the task** from `get_post`. It is already available on
   both paths (`cached["author"]["id"]` on a hit, `post.author_id` on a miss), so
   the debounce no longer needs even the `SELECT author_id` lookup. The arg is
   optional for backwards-compatibility with tasks queued before the deploy.

**Per-view query cost, before → after** (steady state, throttle warm):

| Step | Before | After |
|---|---|---|
| `UPDATE view_count` | 1 | 1 |
| `INSERT PostView` | 1 | 1 |
| `SELECT author_id` | 1 | 0 (passed in) |
| `SELECT SUM(view_count)` over author's posts | 1 | **0 (throttled)** |
| `EXISTS(metadata__threshold=…)` × crossed thresholds | up to 6 | **0 (throttled)** |

So a hot post drops from up to **~10 queries/view** to **2 queries/view**, and the
two that remain are a single-row UPDATE and an append. `test_milestone_aggregate_is_throttled`
asserts exactly this (the second view inside the window issues 2 queries).

### Correctness & tradeoffs

- **Milestones are monotonic and recorded at most once** (the `exists()` guard).
  Throttling only delays *detection* by up to the window; it never double-counts.
- **One honest edge:** if an author's cumulative reads cross a threshold *during* a
  throttled window and then they receive **zero** further views ever, that
  milestone is never recorded. For any author with ongoing traffic the next view
  re-opens the window and detects the (still-crossed) threshold. For a 1,000+ read
  gamification signal this is an acceptable trade; the principled fix is to move
  detection to a periodic sweep (Next steps), which removes this edge entirely.
- **Window choice (60s):** milestones move on the scale of thousands of reads, so a
  ≤60s detection lag is invisible to users while bounding the aggregate to ≤1/min
  per active author regardless of traffic. It's a single constant
  (`MILESTONE_CHECK_THROTTLE`) to tune.
- **New dependency:** the debounce needs the cache. That's safe here — the cache and
  the Celery broker are the same Redis, so if the task is executing at all, the
  cache is reachable.

### How I'd monitor this in production

- **Task-level:** Celery task duration + failure rate for `increment_view_count`
  (Flower / `task-succeeded`/`task-failed` events → StatsD/Prometheus). Watch p95
  duration — it should flatten now that the aggregate is throttled.
- **DB:** `pg_stat_statements` for the `SUM(view_count)` statement — its call rate
  should collapse from "per view" to "≤ per-author-per-minute." Alert on hot-row
  lock waits on `blog_posts` and on `blog_postview` table/index bloat.
- **Queue:** broker depth / `increment_view_count` backlog. A growing backlog is the
  signal that F2 (per-view enqueue + write) is the next bottleneck.
- **Counter for skips:** emit a metric when the debounce skips (the `cache.add`
  returned False) to confirm the hit-rate of the throttle under real traffic.

---

## What I'd do next (designed, deferred)

**1. Batch view counting (addresses F2).** Replace the per-view task with a Redis
counter and a periodic flush:
- In `get_post`: `cache.incr(f"views:pending:{post_id}")` in-request (no Celery
  message, no DB write), and add the id to a `views:dirty` set.
- A **Celery beat** task every 30–60s drains `views:dirty`; for each post it reads
  *and atomically resets* the pending counter (Redis `GETDEL`, or `GETSET → 0`,
  to avoid losing increments that land mid-flush), then does **one**
  `UPDATE … view_count = view_count + N` and runs the (already throttled)
  milestone check once. This collapses N per-view writes + N broker messages into
  one write per post per window.
- **Tradeoff:** view counts become eventually-consistent (≤ flush window) and live
  transiently in Redis — acceptable, since view counts are inherently approximate
  and a lost flush on a Redis crash is a few seconds of counts, not data integrity.
- This needs `CELERY_BEAT_SCHEDULE` + a `beat` process in `docker-compose.yml`,
  which is why it's deferred rather than slipped into this change.

**2. Move milestone detection to that same beat sweep.** Once a periodic task
exists, detection belongs there entirely — it removes the per-view path *and* the
"never-viewed-again" edge above. The per-view path would then only `INCR` a
counter.

**3. Roll up / prune `PostView` (addresses F2 growth).** Analytics only needs
counts per period (30d vs prior 30d). A daily job can fold raw rows older than,
say, 90 days into a `PostViewDaily(post, day, count)` rollup and delete the
originals — bounding the table while keeping trend fidelity.

**4. Separately: the comment-sync polling I added earlier.** The 5s comment poll
(`GET /posts/{slug}/comments`) is uncached and runs per viewer. On a hot post that
is `viewers / 5` uncached queries/sec (a `count()` + a page). The clean fix is a
short-TTL cache on the comment list keyed by post + a per-post "comments version"
bumped on write, so unchanged polls are served from cache (or short-circuited with
a 304/ETag). I scoped it out of this note to keep one path analyzed end-to-end,
but it is the same class of problem and the next thing I'd cache.
