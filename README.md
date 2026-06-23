# Teak-Inspired Blog Platform

A full-stack blogging platform: authors create, edit, publish, and moderate posts;
readers browse, comment, and subscribe. A **React + TypeScript** single-page app
talks to a **Django + Django Ninja + PostgreSQL** API, backed by **Redis** caching
and a **Celery** worker for background work.

The design deliberately mirrors patterns from Teak's embedded platform —
quote → order → policy lifecycle ≈ **draft → published → archived**, partner
config ≈ post metadata, partner webhooks ≈ **event callbacks**, and a fast,
cacheable read path ≈ the public feed.

```
┌──────────────┐    /api (Vite proxy)   ┌──────────────┐   ┌────────────┐
│ React SPA    │ ─────────────────────▶ │ Django Ninja │──▶│ PostgreSQL │
│ (Vite :5173) │  JWT bearer + refresh  │  API (:8000) │   └────────────┘
└──────────────┘                        │   + Celery   │──▶│   Redis    │
                                        └──────────────┘   └────────────┘
```

> **Reviewing this for the engineering exercise?** Jump to
> [Hands-on coding — the parts I engineered by hand](#hands-on-coding--the-parts-i-engineered-by-hand).
> That section is the focus: two backend functionalities written and reasoned
> about by hand (concurrency-safe publishing and reliable webhook delivery),
> contrasted explicitly with the parts that were AI-scaffolded.

---

## Quick start

### 1. Backend (Docker — recommended)

Compose runs the web server, Celery worker, Postgres, and Redis together.

```bash
docker compose up --build           # web :8000, worker, db (host :5433), redis :6379
docker compose exec web python manage.py seed_demo        # demo users + content
docker compose exec web python manage.py createsuperuser  # optional: admin login
```

- **API docs (Swagger):** http://localhost:8000/api/docs
- **Health/readiness:** `GET /api/healthz` (liveness), `GET /api/readyz` (DB + cache)
- **Django admin:** http://localhost:8000/admin/
- Migrations run automatically on `web` startup (`backend/entrypoint.sh`); this
  includes the seeded default category taxonomy and the public-UUID/index migrations.

### 2. Frontend (the SPA)

```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173
```

`frontend/vite.config.ts` proxies `/api`, `/admin`, and `/static` to Django on
`:8000`, so **no CORS configuration is needed**. Open the SPA at
**http://localhost:5173**.

### Demo credentials (after `seed_demo`)

| Role | Username | Password |
|---|---|---|
| Author | `teak_writer` | `Str0ngPass!` |
| Reader | `teak_reader` | `Str0ngPass!` |

> Postgres is published on host port **5433** (not 5432) to avoid clashing with a
> local Postgres — handy if you want to inspect data in pgAdmin
> (`localhost:5433`, db/user/pass all `blog`).

### Tests

```bash
docker compose exec web pytest           # or: docker compose run --rm web pytest
```

**77 passing tests** cover auth (register, login, JWT refresh, password reset),
the post lifecycle, slug generation, idempotency, ownership/tenant rules, comment
visibility & moderation, caching/invalidation, async view counting & milestone
debounce, analytics, the activity feed, webhook signing, **publish idempotency
under repeat-publish**, **webhook retry classification & dead-lettering**,
subscriptions, and comment-ranked sorting.

---

## What you can do (frontend → backend)

| Surface (SPA) | What it does | Key endpoints |
|---|---|---|
| **Login / Register / Forgot / Reset** | JWT auth (username **or** email), self-renewing sessions with a sliding idle timeout, full password-reset flow | `/auth/*`, `/auth/password/reset*` |
| **Insights** (home) | Public feed — the **top published posts by comment count**, plus category tabs | `GET /posts/?sort=comments` |
| **Post detail** | Full article, author info, real-time comments (list · post · edit own), subscribe-to-author, metadata-driven spec fields; **Load more** past 10 comments and a **back-to-top** control past the 7th | `/posts/id/{uuid}`, `/posts/{slug}/comments` |
| **Authoring** (dashboard) | Real analytics (views, subscribers, trust score, audience reach), activity timeline, per-post stats — opened by post **id**, not title | `/me/analytics`, `/me/activity`, `/posts/id/{uuid}/stats` |
| **Content Library** | All your posts across **every status** (draft / published / archived) with edit · preview · archive · unpublish; opens each post by **id** | `/me/posts`, `/posts/{slug}/archive`, `/posts/{slug}/unpublish` |
| **Editor** | Create/edit with live preview, category + tag-by-name input, custom slug, **Save Draft vs Publish** (both return to the Library) | `POST/PUT /posts`, `/posts/{slug}/publish` |
| **Moderation** | Approve/Reject comment queue across all your posts | `/me/comments`, `/comments/{id}/moderate` |
| **Settings / Profile** | Subscriptions (pause/resume/unsubscribe), webhook "callback workflows", secure profile + password editing | `/me/subscriptions`, `/webhooks/`, `PATCH /auth/me` |

---

## API surface

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` (username **or email**), `POST /auth/token/refresh`, `GET /auth/me`, `PATCH /auth/me` |
| Password reset | `POST /auth/password/reset`, `POST /auth/password/reset/confirm` |
| Posts | `GET /posts/` (`?category=&tag=&search=&sort=comments&page=`), `POST /posts/`, `GET /posts/id/{uuid}`, `GET /posts/id/{uuid}/stats`, `GET/PUT/DELETE /posts/{slug}`, `POST /posts/{slug}/publish`, `POST /posts/{slug}/archive`, `POST /posts/{slug}/unpublish`, `GET /posts/{slug}/revisions` |
| Taxonomy | `GET /categories`, `GET /tags` |
| Dashboard / me | `GET /me/posts` (`?status=`), `GET /me/comments` (moderation queue), `GET /me/subscriptions`, `GET /me/analytics`, `GET /me/activity`, `GET /me/notifications`, `POST /me/activity/read` |
| Comments | `GET/POST /posts/{slug}/comments`, `PUT /comments/{uuid}` (edit own), `PUT /comments/{uuid}/moderate` |
| Subscriptions | `POST /subscriptions/`, `PATCH /subscriptions/{uuid}` (pause / frequency), `DELETE /subscriptions/{uuid}` |
| Webhooks | `GET/POST /webhooks/`, `PATCH/DELETE /webhooks/{uuid}` (events: `post.published`, `comment.created`, `user.subscribed`) |
| Ops | `GET /api/healthz`, `GET /api/readyz` |

All under the `/api` prefix; full schema at `/api/docs`. Externally-referenced
resources are addressed by **non-enumerable UUID** (`/posts/id/{uuid}`,
`/subscriptions/{uuid}`, …); integer PKs stay internal for fast FK joins.

---

## Hands-on coding — the parts I engineered by hand

Most of this repo's surface area (settings, Dockerfile, CRUD routers/schemas, the
bulk of the UI, and a lot of the test boilerplate) was **AI-scaffolded and then
reviewed**. That's the right use of the tool: it's fast and correct on the
mechanical 80%. But scaffolding tends to produce the *plausible* version of
correctness, not the version that survives concurrency, partial failure, retries,
and changing requirements. The two functionalities below are where I did the
thinking by hand — the parts a reviewer should read to judge engineering
judgment, not typing speed.

For each one I describe **the failure the generated version had**, **the
invariant I needed**, **the change**, and **the decisions a generator can't make
for you**.

### ① Concurrency-safe publishing — *notify exactly once*

**File:** [`backend/blog/services.py`](backend/blog/services.py) · `publish_post`
**Tests:** `test_publish_is_idempotent_no_double_notify`,
`test_publish_sets_published_at_once`, `test_publish_triggers_notification`

**The generated version.** Publishing read the post, checked `status == DRAFT` in
Python, set it to `PUBLISHED`, saved, then fired subscriber emails + webhooks + an
activity event:

```python
if post.status == Post.Status.DRAFT:
    post.status = Post.Status.PUBLISHED
    post.published_at = timezone.now()
    post.save()
    notify_subscribers.delay(post.id)   # emails + webhooks
```

It passes every single-threaded test. It is also wrong twice over:

1. **Read-then-write race.** Two concurrent publish requests (a double-click, a
   retried request, two tabs) can *both* read `DRAFT`, both pass the check, and
   both fire the fan-out — every subscriber gets **two** emails and the webhook is
   delivered twice. The check and the write are not atomic.
2. **Transaction/Celery race.** `notify_subscribers.delay()` enqueues
   immediately. A fast worker can pick the job up and `SELECT` the post *before*
   this transaction commits — reading a stale/absent row — or the transaction can
   roll back after the email is already on its way.

**The invariant I wanted:** *only one actor may move a post from draft to
published and trigger the fan-out, even under concurrent publishes or a
redelivered job.*

**The change** — claim the transition with a single conditional `UPDATE` and
schedule side effects on commit:

```python
now = timezone.now()
claimed = (
    Post.objects.filter(id=post.id, status=Post.Status.DRAFT)
    .update(status=Post.Status.PUBLISHED, published_at=now, updated_at=now)
)
invalidate_posts()

if not claimed:
    post.refresh_from_db()        # lost the race / already published -> do NOT re-notify
    return post

# We are the sole winner of the DRAFT -> PUBLISHED transition.
def _fire():
    notify_subscribers.delay(post.id)
    emit_event(post.author_id, "post.published", {...})
    record_activity(post.author_id, ActivityEvent.Type.PUBLISH, ...)

transaction.on_commit(_fire)      # never runs against an uncommitted/rolled-back row
```

`filter(status=DRAFT).update(...)` compiles to
`UPDATE ... WHERE id=? AND status='draft'` — the database evaluates the
predicate and the write as **one atomic operation**, and returns the number of
rows it changed. Exactly one concurrent caller gets `claimed == 1` and runs the
fan-out; everyone else gets `0` and quietly returns. The double-notify is now
impossible at the data layer, not just unlikely.

**Decisions a generator can't make for you:**

- **Conditional `UPDATE` vs `select_for_update()`.** A row lock would also be
  correct, but here a single conditional `UPDATE` expresses the whole transition
  atomically without holding a lock across the surrounding work. I'd reach for
  `select_for_update()` when a transition must read-modify-write **several related
  rows** under one lock; for a single-row state flip, the conditional update is
  leaner. (This trade-off is called out in the docstring.)
- **`transaction.on_commit` for the publish→Celery race.** The fan-out is a
  *side effect of a committed fact*. Scheduling it on commit is the difference
  between "subscribers were notified about a post that exists" and "subscribers
  were emailed about a post the DB rolled back."
- **What's authorized where.** The router (`_owned_post`) rejects publishing a
  post you don't own with `403` before the service ever runs — tenant
  authorization lives at the boundary, the invariant lives in the service.

### ② Reliable webhook delivery — retry the transient, dead-letter the terminal

**File:** [`backend/blog/tasks.py`](backend/blog/tasks.py) · `deliver_webhook` /
`_retry_webhook` / `emit_event`
**Tests:** `test_webhook_4xx_is_terminal_not_retried`,
`test_webhook_5xx_is_classified_retryable`,
`test_webhook_dead_letters_after_exhaustion`,
`test_notify_subscribers_signs_webhook`

**The generated version.** Deliver the payload, `raise_for_status()`, and on *any*
`RequestException` retry up to 3 times:

```python
@shared_task(bind=True, acks_late=True, max_retries=3)
def deliver_webhook(self, url, payload, secret=None, webhook_id=None):
    resp = requests.post(url, data=body, headers=headers, timeout=WEBHOOK_TIMEOUT)
    resp.raise_for_status()
    ...
    except requests.RequestException as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

The shape is right (`acks_late`, signing, backoff) but it makes three
mistakes that only show up in production:

1. **It retries permanent failures.** A `404` (wrong URL), `401`/`403` (bad
   secret), or `400` (malformed payload) will *never* succeed — retrying them
   four times just wastes workers and hammers a receiver that already said no.
2. **`acks_late=True` is set, but delivery isn't safe to repeat.** `acks_late`
   means a worker crash mid-task **redelivers the message** — so the same webhook
   can fire more than once. Without a stable id, the receiver can't tell a
   redelivery from a new event.
3. **One timeout for connect and read,** so a peer that completes the TCP
   handshake and then hangs can pin a worker for the full window.

**The change** — classify the failure, make at-least-once safe, split the timeout:

```python
WEBHOOK_RETRYABLE_STATUS = {429, 500, 502, 503, 504}   # everything else 4xx is terminal

try:
    resp = requests.post(url, data=body, headers=headers,
                         timeout=(WEBHOOK_CONNECT_TIMEOUT, WEBHOOK_READ_TIMEOUT))
except (requests.ConnectionError, requests.Timeout) as exc:
    return _retry_webhook(self, exc, webhook_id, status=None)   # no answer -> transient

if resp.status_code in WEBHOOK_RETRYABLE_STATUS:
    return _retry_webhook(self, RuntimeError(f"HTTP {resp.status_code}"),
                          webhook_id, status=resp.status_code)
if resp.status_code >= 400:
    _set_health(webhook_id, resp.status_code, Webhook.Health.FAILING)   # terminal -> dead-letter
    return                                                              # NO retry
```

Idempotency for the `acks_late` redelivery is a stable per-delivery id that
`emit_event` generates and threads through as a header the receiver can dedupe on:

```python
deliver_webhook.delay(hook.url, payload, hook.secret or None, hook.id, uuid.uuid4().hex)
# ...
headers["X-Webhook-Id"] = event_id or self.request.id or ""
```

And retries back off **with jitter** so a receiver coming back from an outage
isn't hit by a synchronized thundering herd; on exhaustion the webhook is flagged
`FAILING` — the signal operators watch:

```python
def _retry_webhook(task, exc, webhook_id, status):
    if task.request.retries < task.max_retries:
        backoff = min(2 ** task.request.retries, 60)
        raise task.retry(exc=exc, countdown=backoff + random.uniform(0, backoff / 2))
    if webhook_id:
        _set_health(webhook_id, status, Webhook.Health.FAILING)   # dead-letter signal
```

**Decisions a generator can't make for you:**

- **Which errors are retryable is domain knowledge, not a library default.**
  Timeouts, connection errors, `429`, and `5xx` are "try again later"; other
  `4xx` are "this will never work." Retrying the second class is actively harmful.
- **`acks_late` is a promise you have to keep.** Turning it on without making the
  task safe to repeat trades one failure mode (lost on crash) for another
  (duplicate on redelivery). The `X-Webhook-Id` header is what makes the promise
  honest.
- **Split connect/read timeouts + jitter** are the cheap, deliberate choices that
  keep one bad receiver from degrading the whole worker pool.

### Supporting decisions in the same spirit

These are smaller but were chosen, not defaulted:

- **Idempotent create** (`services.create_post`): `POST /posts/` honors an
  `Idempotency-Key`; a replay returns the original post, and a concurrent race on
  the same key rolls back the loser and returns the winner's row.
- **`increment_view_count` is deliberately *not* `acks_late`.** It is the
  highest-frequency event in the app and **not** idempotent (it's `+1`). At-least-
  once redelivery would over-count, so it uses default acking — a dropped view on
  a crash is acceptable; a double-count is a lie in someone's analytics.
- **Milestone aggregate is debounced** with an atomic `cache.add` (Redis `SETNX`)
  so the cross-post `SUM` runs at most once per author per window instead of on
  every single view.
- **View bump never fails a read** (`_bump_views` in the posts router): a broker
  outage logs and is swallowed, because a missed counter increment must not turn a
  page view into a `500`.

> The expanded write-up of the read/view path lives in
> [`backend/docs/performance-view-path.md`](backend/docs/performance-view-path.md).

---

## Architecture & key design decisions

```
backend/
  config/   # Django project: settings, urls, celery, wsgi/asgi
  users/    # custom User (email-unique, title/domain/bio profile, public uuid)
  blog/     # domain: models, services, tasks, cache, analytics, activity, seed
  api/      # Django Ninja: routers, schemas, JWT auth/security, pagination, health
  tests/    # pytest-django suite (77 tests)
frontend/
  src/
    store/      # Redux Toolkit + RTK Query (apiSlice, authSlice, apiError)
    features/   # auth pages (login, register, forgot, reset)
    pages/      # Insights, PostDetail, Editor, Dashboard, Library, Moderation, Settings, EditProfile
```

**1. Thin routers, fat services.** Domain rules — the publish/archive/unpublish
state machine, slug generation, idempotency, revision bookkeeping, cache
invalidation, event emission — live in `blog/services.py`, not the HTTP layer.
Routers parse, authorize, serialize, and delegate. The rules stay unit-testable
and reusable from the admin, a management command, or a future GraphQL layer.

**2. Hand-rolled JWT (PyJWT), not DRF SimpleJWT.** Token auth was the only thing
that would have dragged DRF into an otherwise Ninja-native stack. HS256
access/refresh tokens are issued/verified directly (`api/security.py`, ~70 lines).
The session model: a **30-minute access token**, **auto-refreshed on 401**
(`store/apiSlice.ts` `baseQueryWithReauth`, single-flight) so a working session is
never interrupted; a refresh token that doubles as an **absolute session ceiling**
(`JWT_SESSION_HOURS`, default 24h — the new access token is capped to it); and a
**sliding 1-hour idle timeout** on the client (`authSlice.ts`) that resets on
activity and logs out an idle tab.

**3. Password reset, done properly.** `POST /auth/password/reset` always returns
`200` (no account enumeration), emails a tokenized link built with Django's
`default_token_generator`; `…/confirm` validates the token + runs the password
validators. Email uses the console backend in dev and **real SMTP when
configured** (`EMAIL_HOST` etc. — see `backend/.env.example`).

**4. Explicit post lifecycle.** `draft → published → archived` (and
`published → draft` via unpublish) enforced in services — see
[Hands-on coding ①](#-concurrency-safe-publishing--notify-exactly-once) for the
concurrency-safe transition. Only drafts can be hard-deleted; published posts are
archived or unpublished, never destroyed.

**5. Cache-aside with versioned keys (`blog/cache.py`).** The hot read paths
(list + detail) are cached in Redis under keys that embed a global version
counter; any write bumps the version, atomically invalidating every list/detail
entry. Redis is configured to **degrade gracefully** (`IGNORE_EXCEPTIONS`) so a
cache outage slows reads rather than failing them. View counts are incremented
**asynchronously** off the read path (Celery) and logged to a `PostView`
time-series for real trend/milestone analytics.

**6. Celery for side effects.** Publishing fans out subscriber notifications and
HMAC-SHA256-signed (`X-Signature-256`) webhook deliveries with retry
classification, backoff + jitter, idempotency, and dead-lettering — see
[Hands-on coding ②](#-reliable-webhook-delivery--retry-the-transient-dead-letter-the-terminal).
Webhook `health` reflects the last delivery result.

**7. Real analytics, not mock numbers** (`blog/analytics.py`). Total views,
subscriber count, deltas (30d vs prior 30d), a documented trust-score heuristic,
and per-category "audience reach" are all aggregated from real data — single
grouped queries riding existing indexes (e.g. `comment_count` via an annotated
`Count(..., distinct=True)`), no N+1.

**8. Idempotent creates & performance basics.** `POST /posts/` honors an optional
`Idempotency-Key` header (unique `(user, key)` + race-safe fallback).
`PostQuerySet.with_related()` kills N+1 on every list/detail; composite indexes
(`migrations 0005`) back the public-list, dashboard, moderation, and notification
access patterns. Public **UUID columns** (`migration 0003`) give non-enumerable
URLs while keeping integer PKs for joins.

**9. Frontend data layer.** RTK Query owns server state with **tag-based cache
invalidation** — mutations invalidate `{Post, LIST}` / `Analytics` / `Activity`,
and list views provide matching tags so a new draft or archive reflects
immediately. The comment thread **polls for near-real-time sync** so a reader sees
others' comments appear without a refresh. Auth-only routes are guarded; the nav
hides authoring tabs when signed out.

---

## Assumptions made

- **Anyone registered can author** — no separate "author" role; ownership is
  enforced per-post (tenant authorization at the router boundary).
- **Login by username or email**; email is unique.
- **Comments** are allowed only on *published* posts. The full
  `pending → approved → rejected` lifecycle exists in the model and the moderation
  queue, but at this stage **every comment is auto-approved on creation** so it is
  immediately visible (re-enabling moderation is a one-line change in the comment
  router). Visibility still applies: the public sees `approved`, a signed-in
  commenter always sees their own, and the post author sees all statuses.
- **Categories are a seeded, controlled taxonomy** (`Engineering`, `Product`,
  `Security`, `Infrastructure` — `migration 0004`), one per post; the set is never
  empty for an authoring UI. Tags are free-form and get-or-created by name.
- **Deletion** is restricted to drafts; published/archived content is retired by
  archiving or unpublishing, not destroyed.
- **Self-subscription** is disallowed (DB check constraint + API guard).
- **View counts / comment-ranked feed are eventually consistent** — cached
  responses (≤120 s) may lag a brand-new view or comment by design.
- **Search** uses case-insensitive `icontains` across title/excerpt/content as a
  pragmatic baseline.
- Dev infra (Postgres/Redis/Celery) runs unauthenticated on a single node; email
  prints to the console unless SMTP is configured.

---

## How AI tools were used

AI was used throughout, the way it's used on real work: to move fast on
boilerplate and generate UI, while the architecture, data flow, and every
trade-off were owned and reviewed. The
[Hands-on coding](#hands-on-coding--the-parts-i-engineered-by-hand) section above
is the explicit contrast — what the generator produced vs what correctness under
concurrency and failure actually required.

- **Backend — AI-scaffolded, human-directed.** The repetitive parts (settings,
  Docker, model/schema/router boilerplate, the bulk of the pytest suite) were
  AI-generated and reviewed. The decisions that matter — the service-layer split,
  the concurrency-safe publish, webhook retry classification + idempotency,
  versioned cache invalidation, on-commit side effects, the idempotency model,
  hand-rolled JWT, the analytics aggregation — were directed deliberately.
- **Frontend — design-tool UI, then integrated.** The page components were
  generated with a design/codegen tool and then **wired to the real API and
  corrected**. Representative fixes that came out of that integration:
  - `read_time` was first a Ninja schema *resolver* that silently dropped out of
    the **cached** response path (7 failing tests) → moved to a `Post` model
    property that serializes identically fresh or cached.
  - the editor sent a **stale `category_id`** (the dropdown only changed the
    name) → resolve the id from the selected category at save time.
  - the SPA never refreshed an expired access token → added single-flight
    **refresh-on-401** plus a sliding idle timeout.
  - the dashboard/library opened posts by **title slug**, which broke on
    duplicate/edited titles → route by the post's stable **id/uuid** instead.
  - RTK Query **cache-tag mismatches** meant new drafts/archives didn't appear
    until a remount → aligned `providesTags` / `invalidatesTags`.
  - generic "Synchronization Failure" toasts hid the server's real message →
    surface `error.data.detail` via a shared `getApiErrorMessage` helper.

---

## What I'd do differently / next

1. **Tighten the frontend TypeScript.** A few of the codegen-heavy pages still
   carry framer-motion typing issues that don't affect the dev server but would
   need cleanup before `npm run build` is green.
2. **Real full-text search** — a stored `SearchVectorField` + GIN index (and
   `pg_trgm` for fuzzy matching) instead of `icontains`; the query is isolated in
   one place.
3. **Harden auth** — asymmetric (RS256) keys, refresh-token rotation + a
   blacklist/logout path, and rate-limiting on auth + write endpoints.
4. **Finer-grained cache invalidation** — per-author/per-tag namespaces instead
   of a single global version bump, to keep more of the cache warm under writes;
   invalidate the posts list on comment changes so the comment-ranked feed is
   instant.
5. **Operational depth** — a durable dead-letter queue + delivery log for failed
   webhooks (today exhaustion flags `health=FAILING`), structured logging, request
   IDs, and metrics.
