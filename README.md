# Teak-Inspired Blog Platform — Backend

A small but production-shaped blogging backend: authors create, edit, and
publish posts; readers browse, comment, and subscribe. Built with **Django +
Django Ninja + PostgreSQL**, with **Redis** caching and **Celery** for
background work. The design deliberately mirrors patterns from Teak's embedded
platform (quote → order → policy lifecycle ≈ draft → published → archived;
partner config ≈ post metadata; partner webhooks ≈ subscriptions).

> Scope: **backend only**. The `frontend/` directory is intentionally left
> empty for this submission.

---

## Quick start (Docker — recommended)

Everything (web, Celery worker, Postgres, Redis) is orchestrated by Compose.

```bash
# from the repo root
docker compose up --build           # starts db, redis, web (:8000), worker

# in another shell: load demo data
docker compose exec web python manage.py seed_demo
```

Then open:

- **Interactive API docs (Swagger):** http://localhost:8000/api/docs
- **OpenAPI schema:** http://localhost:8000/api/openapi.json
- **Django admin:** http://localhost:8000/admin/ (create an admin with
  `docker compose exec web python manage.py createsuperuser`)

Migrations are applied automatically on `web` startup (see `entrypoint.sh`).

Demo credentials after seeding: `teak_writer` / `teak_reader`, password
`Str0ngPass!`.

### Run the tests

```bash
docker compose run --rm web pytest
```

36 tests cover auth, the post lifecycle, slug generation, idempotency,
ownership rules, comment moderation, caching/invalidation, async view counting,
and webhook signing.

### A 30-second end-to-end taste (curl)

```bash
B=http://localhost:8000/api
TOK=$(curl -s -X POST $B/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"me","email":"me@example.com","password":"Str0ngPass!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['tokens']['access'])")

SLUG=$(curl -s -X POST $B/posts/ -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: k1' \
  -d '{"title":"Hello","content":"My first post body."}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['slug'])")

curl -s -X POST $B/posts/$SLUG/publish -H "Authorization: Bearer $TOK"
curl -s "$B/posts/"            # public, cached list
```

## Running locally without Docker

Requires Python 3.12, a local PostgreSQL, and a local Redis.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # edit DATABASE_URL / REDIS_URL to taste
python manage.py migrate
python manage.py runserver
# separate shell, for async tasks:
celery -A config worker -l info
```

> Tip: set `CELERY_TASK_ALWAYS_EAGER=True` in `.env` to run tasks inline
> without a worker.

---

## API surface

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/token/refresh`, `GET /api/auth/me` |
| Posts | `GET /api/posts/`, `POST /api/posts/`, `GET/PUT/DELETE /api/posts/{slug}`, `POST /api/posts/{slug}/publish`, `POST /api/posts/{slug}/archive`, `GET /api/posts/{slug}/revisions` |
| Dashboard | `GET /api/me/posts`, `GET /api/me/subscriptions` |
| Comments | `GET/POST /api/posts/{slug}/comments`, `PUT /api/comments/{id}/moderate` |
| Subscriptions | `POST /api/subscriptions/`, `DELETE /api/subscriptions/{id}` |

---

## Architecture & key design decisions

```
backend/
  config/        # Django project: settings, urls, celery, wsgi/asgi
  users/         # custom User model
  blog/          # domain: models, services, tasks, cache, admin, seed command
  api/           # Django Ninja layer: routers, schemas, JWT auth, pagination
  tests/         # pytest-django suite
```

**1. Thin routers, fat services.** All domain rules — the publish/archive state
machine, slug generation, idempotency, revision bookkeeping, cache
invalidation — live in `blog/services.py`, not in the HTTP layer. Routers just
parse/serialize and delegate. This keeps the rules unit-testable and reusable
(admin, management commands, a future GraphQL/gRPC surface) and keeps the API
files readable.

**2. Custom `User` from day one.** Swapping in a custom user model later is one
of Django's most painful migrations, so it's done up front even though the
extra profile fields are small. `email` is unique (used for notifications).

**3. Hand-rolled JWT (PyJWT), not DRF SimpleJWT.** Token auth was the only thing
that would have pulled DRF into an otherwise Ninja-native stack. Issuing and
verifying HS256 access/refresh tokens directly (`api/security.py`, ~40 lines)
is transparent, easy to defend in review, and avoids coupling the API to DRF.
The trade-offs (symmetric key, no rotation/blacklist yet) are listed under
"what I'd do next".

**4. Explicit post lifecycle.** `draft → published → archived` is enforced in
`services.py`: publishing validates content, stamps `published_at` once
(re-publish is a no-op on the timestamp), and only fires subscriber
notifications on the *first* `draft → published` transition, via
`transaction.on_commit` so we never notify on a rolled-back write. Only drafts
can be hard-deleted; published posts are archived instead.

**5. Cache-aside with versioned keys (`blog/cache.py`).** The hot read paths
(list + detail) are cached in Redis. Rather than track the unbounded set of
filter/page permutations, every key embeds a global version counter; any write
bumps the version, atomically invalidating all list/detail entries. Simple,
correct, and the same trick Teak-style config caches use. View counts are
incremented **asynchronously** off the read path (Celery), so the detail
response stays fast at the cost of an eventually-consistent counter.

**6. Celery for side effects.** Publishing fans out notifications to
subscribers; webhook subscriptions get a real HTTP POST signed with an
HMAC-SHA256 `X-Signature-256` header (mirroring partner webhook signing), with
automatic retry/backoff. Email uses Django's console backend in dev.

**7. Idempotent creates.** `POST /api/posts/` honors an optional
`Idempotency-Key` header; replaying a key returns the originally created post
instead of duplicating — the same safety Teak's order creation gets from quote
tokens. Enforced with a unique `(user, key)` constraint plus a race-safe
fallback.

**8. Flexible `metadata` JSONField on `Post`.** Per-post SEO overrides,
experiment variants, and display settings live in a JSON blob so product
behavior can change without a schema migration — analogous to Teak's
partner/product config.

**9. Performance basics.** A `PostQuerySet.with_related()`
(`select_related("author", "category").prefetch_related("tags")`) kills N+1 on
every list/detail; composite indexes back the two real access patterns
(`(status, -published_at)` for the public list, `(author, -created_at)` for the
dashboard).

---

## Assumptions made

- **Anyone registered can author.** There's no separate "author" role/approval
  step; ownership is enforced per-post instead. Easy to add a role/flag later.
- **Username + password login;** email is unique and reserved for notifications.
- **Comments** are allowed only on *published* posts. The post's author is
  auto-approved; everyone else starts `pending`. The public sees only
  `approved` comments; the author sees all statuses.
- **Deletion** is restricted to drafts; published content is archived (soft
  retire) rather than destroyed.
- **Self-subscription** is disallowed (DB check constraint + API guard).
- **View counts are eventually consistent** — a cached detail response may show
  a slightly stale count by design.
- **Search** uses case-insensitive `icontains` across title/excerpt/content as a
  pragmatic baseline (see next section).
- Dev infra (Redis/Celery/Postgres) runs unauthenticated on a single node.

---

## How AI tools were used

AI (an LLM coding assistant) was used throughout, in the way I'd use it on real
work: to scaffold boilerplate fast and to rubber-duck design, while I owned the
architecture and reviewed every line.

- **AI-generated, then reviewed:** the repetitive scaffolding — `settings.py`,
  Docker/Compose/entrypoint, model and schema boilerplate, the bulk of the
  pytest suite, and the first drafts of the routers.
- **Directed by me (the decisions that matter):** the service-layer split, the
  versioned cache-invalidation scheme, doing notifications on
  `transaction.on_commit` only on the real state transition, the idempotency
  model, and the choice to hand-roll JWT rather than pull in DRF.
- **Corrected AI output — concrete example:** the assistant first modeled
  `read_time_minutes` as a Django Ninja schema *resolver*. That works when Ninja
  serializes a model directly, but it broke once responses were cached: the
  serialized dict round-tripped back through response validation, the resolver
  didn't re-run, and 7 tests failed with `read_time_minutes Field required`. I
  moved the computation to a plain `Post.read_time_minutes` **model property**,
  which serializes identically on both the fresh and cached paths. The test
  suite caught this before it shipped.
- I also tightened a few AI defaults: switching the deprecated
  `CheckConstraint(check=...)` to `condition=`, and only firing subscriber
  notifications on the first publish rather than on every publish call.

---

## What I'd do differently / next, given more time

1. **Real full-text search.** Replace `icontains` with a stored
   `SearchVectorField` + GIN index (and `pg_trgm` for fuzzy/typo tolerance).
   The query shape is already isolated in one place, so this is a contained
   change.
2. **Harden auth.** Move to asymmetric (RS256) keys, add refresh-token rotation
   and a blacklist/logout path, and rate-limit the auth + write endpoints.
3. **Finer-grained cache invalidation.** The global version bump is simple and
   correct but invalidates more than strictly necessary; per-author/per-tag
   namespaces would keep more of the cache warm under heavy writes.
4. **Operational depth on webhooks.** A dead-letter queue and a delivery-attempt
   log for failed webhooks, plus structured logging, request IDs, and metrics.
5. **Build the React + TypeScript frontend** to make it usable end-to-end (out
   of scope for this backend-only submission).
```
