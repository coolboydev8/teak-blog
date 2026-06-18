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
- **Django admin:** http://localhost:8000/admin/
- Migrations run automatically on `web` startup (`backend/entrypoint.sh`).

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
docker compose run --rm web pytest
```

**54 passing tests** cover auth (register, login, JWT refresh, password reset),
the post lifecycle, slug generation, idempotency, ownership rules, comment
moderation, caching/invalidation, async view counting, analytics, the activity
feed, webhook signing, subscriptions, and comment-ranked sorting.

---

## What you can do (frontend → backend)

| Surface (SPA) | What it does | Key endpoints |
|---|---|---|
| **Login / Register / Forgot / Reset** | JWT auth (username **or** email), self-renewing sessions, full password-reset flow | `/auth/*`, `/auth/password/reset*` |
| **Insights** (home) | Public feed — the **top 5 published posts by comment count**, plus category tabs | `GET /posts/?sort=comments` |
| **Post detail** | Full article, author info, comments (list + post), subscribe-to-author, metadata-driven spec fields | `/posts/{slug}`, `/posts/{slug}/comments`, `/subscriptions/` |
| **Authoring** (dashboard) | Real analytics (views, subscribers, trust score, audience reach), activity timeline — published posts only | `/me/analytics`, `/me/activity`, `/me/posts?status=published` |
| **Content Library** | All your posts across **every status** (draft / published / archived) with edit · preview · archive | `/me/posts`, `/posts/{slug}/archive` |
| **Editor** | Create/edit with live preview, category + tag-by-name input, custom slug, Save Draft vs Publish | `POST/PUT /posts`, `/posts/{slug}/publish` |
| **Moderation** | Approve/Reject comment queue across all your posts | `/me/comments`, `/comments/{id}/moderate` |
| **Settings** | Subscriptions (pause/resume/unsubscribe), webhook "callback workflows", profile editing | `/me/subscriptions`, `/webhooks/`, `PATCH /auth/me` |

---

## API surface

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` (username **or email**), `POST /auth/token/refresh`, `GET /auth/me`, `PATCH /auth/me` |
| Password reset | `POST /auth/password/reset`, `POST /auth/password/reset/confirm` |
| Posts | `GET /posts/` (`?category=&tag=&search=&sort=comments&page=`), `POST /posts/`, `GET/PUT/DELETE /posts/{slug}`, `POST /posts/{slug}/publish`, `POST /posts/{slug}/archive`, `GET /posts/{slug}/revisions` |
| Taxonomy | `GET /categories`, `GET /tags` |
| Dashboard / me | `GET /me/posts` (`?status=`), `GET /me/comments` (moderation queue), `GET /me/subscriptions`, `GET /me/analytics`, `GET /me/activity`, `GET /me/notifications`, `POST /me/activity/read` |
| Comments | `GET/POST /posts/{slug}/comments`, `PUT /comments/{id}/moderate` |
| Subscriptions | `POST /subscriptions/`, `PATCH /subscriptions/{id}` (pause / frequency), `DELETE /subscriptions/{id}` |
| Webhooks | `GET/POST /webhooks/`, `PATCH/DELETE /webhooks/{id}` (events: `post.published`, `comment.created`, `user.subscribed`) |

All under the `/api` prefix; full schema at `/api/docs`.

---

## Architecture & key design decisions

```
backend/
  config/   # Django project: settings, urls, celery, wsgi/asgi
  users/    # custom User (email-unique, title/domain/bio profile)
  blog/     # domain: models, services, tasks, cache, analytics, activity, seed
  api/      # Django Ninja: routers, schemas, JWT auth/security, pagination
  tests/    # pytest-django suite (54 tests)
frontend/
  src/
    store/      # Redux Toolkit + RTK Query (apiSlice, authSlice, apiError)
    features/   # auth pages (login, register, forgot, reset)
    pages/      # Insights, PostDetail, Editor, Dashboard, Library, Moderation, Settings, EditProfile
```

**1. Thin routers, fat services.** Domain rules — the publish/archive state
machine, slug generation, idempotency, revision bookkeeping, cache invalidation,
event emission — live in `blog/services.py`, not the HTTP layer. Routers parse,
serialize, and delegate. The rules stay unit-testable and reusable.

**2. Hand-rolled JWT (PyJWT), not DRF SimpleJWT.** Token auth was the only thing
that would have dragged DRF into an otherwise Ninja-native stack. HS256
access/refresh tokens are issued/verified directly (`api/security.py`, ~40 lines).
The SPA stores both and **auto-refreshes on 401** (`store/apiSlice.ts`
`baseQueryWithReauth`, single-flight), so a 30-minute access token never
interrupts a working session; only an expired 7-day refresh token logs you out.

**3. Password reset, done properly.** `POST /auth/password/reset` always returns
`200` (no account enumeration), emails a tokenized link built with Django's
`default_token_generator`; `…/confirm` validates the token + runs the password
validators. Email uses the console backend in dev and **real SMTP when
configured** (`EMAIL_HOST` etc. — see `backend/.env.example`).

**4. Explicit post lifecycle.** `draft → published → archived` enforced in
services: publishing validates content, stamps `published_at` once, and fires
subscriber notifications + webhooks + an activity event **only on the first
`draft → published` transition**, via `transaction.on_commit` (never on a
rolled-back write). Only drafts can be hard-deleted; published posts are archived.

**5. Cache-aside with versioned keys (`blog/cache.py`).** The hot read paths
(list + detail) are cached in Redis under keys that embed a global version
counter; any write bumps the version, atomically invalidating every list/detail
entry. View counts are incremented **asynchronously** off the read path (Celery)
and logged to a `PostView` time-series for real trend/milestone analytics.

**6. Celery for side effects.** Publishing fans out subscriber notifications and
HMAC-SHA256-signed (`X-Signature-256`) webhook deliveries with retry/backoff, and
records activity-feed events. Webhook `health` reflects the last delivery result.

**7. Real analytics, not mock numbers** (`blog/analytics.py`). Total views,
subscriber count, deltas (30d vs prior 30d), a documented trust-score heuristic,
and per-category "audience reach" are all aggregated from real data — single
grouped queries riding existing indexes (e.g. `comment_count` via an annotated
`Count(..., distinct=True)`), no N+1.

**8. Idempotent creates & performance basics.** `POST /posts/` honors an optional
`Idempotency-Key` header (unique `(user, key)` + race-safe fallback).
`PostQuerySet.with_related()` kills N+1 on every list/detail; composite indexes
back the public-list and dashboard access patterns.

**9. Frontend data layer.** RTK Query owns server state with **tag-based cache
invalidation** — mutations invalidate `{Post, LIST}` / `Analytics` / `Activity`,
and list views provide matching tags so a new draft or archive reflects
immediately. Auth-only routes are guarded; the nav hides authoring tabs when
signed out.

---

## Assumptions made

- **Anyone registered can author** — no separate "author" role; ownership is
  enforced per-post.
- **Login by username or email**; email is unique.
- **Comments** are allowed only on *published* posts; the post author is
  auto-approved, everyone else starts `pending`; the public sees only `approved`,
  the author sees all statuses.
- **Deletion** is restricted to drafts; published/archived content is retired by
  archiving, not destroyed.
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
trade-off were owned and reviewed.

- **Backend — AI-scaffolded, human-directed.** The repetitive parts (settings,
  Docker, model/schema/router boilerplate, the bulk of the pytest suite) were
  AI-generated and reviewed. The decisions that matter — the service-layer split,
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
    **refresh-on-401**.
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
5. **Operational depth** — a dead-letter queue + delivery log for failed
   webhooks, structured logging, request IDs, and metrics.
