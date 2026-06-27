# Shawty — Link Shortener

A full-stack link-shortener built for the **Simhatel Technology / IIT Mandi** take-home task.
The backend is a FastAPI + PostgreSQL REST API; the frontend is a Next.js 15 app with Clerk authentication.

**Live demo:** https://linkshortener.brewwithcrew.com  
**API docs (Swagger):** https://api-linkshortener.brewwithcrew.com/docs

---

## Features

| Feature | Detail |
|---|---|
| Short-link creation | Auto-generated Base58 codes or custom slugs |
| Redirect + click tracking | `GET /{code}` redirects and increments the counter |
| Password-lock | Links can require a password before redirecting |
| Expiry dates | Optional future timestamp; expired links return `410 Gone` |
| Pagination | `GET /links` supports `page` / `page_size` |
| Stats endpoint | `GET /links/{code}/stats` returns click count + metadata |
| JWT auth (Clerk) | Authenticated links are owned by a user and scoped to them |
| Guest mode | Anonymous users can shorten links without signing in |
| Rate limiting | Per-IP / per-user throttle on creation, redirects, and unlock |
| OpenAPI docs | Auto-generated Swagger UI at `/docs` |

---

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — API framework with OpenAPI auto-docs
- [SQLAlchemy](https://www.sqlalchemy.org/) ORM + PostgreSQL (via `psycopg`)
- [Alembic](https://alembic.sqlalchemy.org/) for schema migrations
- [Clerk](https://clerk.com/) backend SDK for JWT verification
- [bcrypt](https://pypi.org/project/bcrypt/) for password hashing
- [slowapi](https://slowapi.readthedocs.io/) + [limits](https://limits.readthedocs.io/) for rate limiting
- [pytest](https://pytest.org/) + [httpx](https://www.python-httpx.org/) for endpoint testing
- [Gunicorn](https://gunicorn.org/) + Uvicorn workers for production
- Docker for containerisation

**Frontend**
- [Next.js 15](https://nextjs.org/) (App Router, TypeScript)
- [Clerk](https://clerk.com/) for auth (sign-in, user management)
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [Lucide React](https://lucide.dev/) for icons

---

## Project Structure

```
.
├── backend/
│   ├── link_shortener/
│   │   ├── main.py        # FastAPI app, routes, lifespan
│   │   ├── models.py      # SQLAlchemy ORM models
│   │   ├── schemas.py     # Pydantic request/response schemas
│   │   ├── services.py    # Business logic (create, redirect, lock, expire)
│   │   ├── auth.py        # Clerk JWT dependency
│   │   ├── database.py    # Engine + session factory
│   │   └── config.py      # Pydantic-settings configuration
│   ├── tests/
│   │   ├── conftest.py    # In-memory SQLite test client fixture
│   │   └── test_links.py  # 16 pytest tests covering all core behaviour
│   ├── alembic/           # Migration scripts
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/
    └── linkshortener/
        ├── src/app/
        │   ├── page.tsx          # Home — shorten, history, lock toggle
        │   ├── dashboard/        # Authenticated link management
        │   └── unlock/[code]/    # Password-entry page for locked links
        └── src/components/       # Navbar, Footer, ExpiryPicker, etc.
```

---

## Running the Backend Locally

### Prerequisites

- Python 3.11+
- A running PostgreSQL instance

### Steps

```bash
cd backend

python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Set the required environment variable (PowerShell shown; adapt for bash):

```powershell
$env:LINK_SHORTENER_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/link_shortener"
```

Run migrations and start the server:

```bash
alembic upgrade head
uvicorn app:app --reload
```

API available at **http://127.0.0.1:8000**. Swagger UI at **http://127.0.0.1:8000/docs**.

---

## Running the Backend with Docker

```bash
cd backend

docker build -t shawty-api .

docker run --rm -p 8000:8000 \
  -e LINK_SHORTENER_DATABASE_URL="postgresql+psycopg://postgres:postgres@host.docker.internal:5432/link_shortener" \
  shawty-api
```

> **Windows PowerShell** — replace `\` with `` ` `` for line continuation, or put everything on one line.

---

## Running the Tests

Tests use an isolated in-memory SQLite database and a freshly reset rate-limit store — no PostgreSQL required.

```bash
cd backend
python -m pytest tests/ -v
```

Expected output — all 17 tests pass:

```
tests/test_links.py::test_create_link_returns_short_url_and_stats    PASSED
tests/test_links.py::test_redirect_records_click                     PASSED
tests/test_links.py::test_custom_code_conflict_returns_409           PASSED
tests/test_links.py::test_same_url_is_idempotent                     PASSED
tests/test_links.py::test_anonymous_links_are_not_deduplicated       PASSED
tests/test_links.py::test_auth_me_returns_authenticated_user_id      PASSED
tests/test_links.py::test_openapi_includes_bearer_security           PASSED
tests/test_links.py::test_paginated_list                             PASSED
tests/test_links.py::test_links_are_scoped_to_owner                  PASSED
tests/test_links.py::test_past_expiry_is_rejected                    PASSED
tests/test_links.py::test_locked_link_is_flagged_in_response         PASSED
tests/test_links.py::test_locked_link_redirect_returns_423           PASSED
tests/test_links.py::test_unlock_with_correct_password_returns_url   PASSED
tests/test_links.py::test_unlock_with_wrong_password_returns_401     PASSED
tests/test_links.py::test_unlock_records_click                       PASSED
tests/test_links.py::test_unlock_on_unlocked_link_returns_url        PASSED
tests/test_links.py::test_create_link_rate_limit_trips_on_11th_request PASSED
17 passed in ~4s
```

---

## API Reference

### Core endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/links` | Optional | Create a short link |
| `GET` | `/links` | Required | List your links (paginated) |
| `GET` | `/links/{code}/stats` | Required | Click count + metadata |
| `GET` | `/{code}` | None | Redirect (or 423 if locked) |
| `POST` | `/{code}/unlock` | None | Submit password, get destination URL |
| `GET` | `/auth/me` | Required | Validate token + return user ID |
| `GET` | `/health` | None | Health check |

### Example curl calls

**Create a short link (auto-generated code)**
```bash
curl -X POST http://127.0.0.1:8000/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.iitmandi.ac.in/"}'
```

**Create with a custom code**
```bash
curl -X POST http://127.0.0.1:8000/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/docs","custom_code":"docs"}'
```

**Create a password-protected link**
```bash
curl -X POST http://127.0.0.1:8000/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/secret","password":"hunter2"}'
```

**Create a link with an expiry date**
```bash
curl -X POST http://127.0.0.1:8000/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/event","expires_at":"2026-12-31T23:59:59Z"}'
```

**Follow a redirect (non-locked)**
```bash
curl -Li http://127.0.0.1:8000/docs
```

**Unlock a password-protected link**
```bash
curl -X POST http://127.0.0.1:8000/AbCdEfG/unlock \
  -H "Content-Type: application/json" \
  -d '{"password":"hunter2"}'
# → {"url": "https://example.com/secret"}
```

**Verify rate limiting (11th request within a minute returns 429)**
```bash
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://127.0.0.1:8000/links \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"https://example.com/$i\"}"
done
# First 10 → 201, 11th → 429
```

**Fetch stats (requires Bearer token)**
```bash
curl http://127.0.0.1:8000/links/docs/stats \
  -H "Authorization: Bearer <clerk_session_jwt>"
```

**Paginated list**
```bash
curl "http://127.0.0.1:8000/links?page=1&page_size=20" \
  -H "Authorization: Bearer <clerk_session_jwt>"
```

---

## Decisions

### Short code generation
Codes are 7-character strings from a **Base58 alphabet** — the same set Bitcoin addresses use — which strips visually ambiguous characters (`0`, `O`, `I`, `l`). Generation retries on collision (up to 8 attempts) before surfacing a 503. For a high-traffic service the right move would be pre-generating a pool of codes in a background job.

### Idempotency
Posting the same long URL twice as the **same authenticated user** returns the existing link (HTTP 200) instead of creating a duplicate. Anonymous requests always create a new code because there is no stable identity to key on.

### Rate limiting
Throttle is implemented with **slowapi** (a Starlette-native wrapper around the `limits` library). Three endpoints are guarded:

| Endpoint | Default limit | Rationale |
|---|---|---|
| `POST /links` | 10 / minute | Creation is a write; protects the DB from bulk spam |
| `GET /{code}` | 60 / minute | Redirects are read-heavy; limit is generous but caps scraping |
| `POST /{code}/unlock` | 5 / minute | Prevents brute-force password guessing |

The key function prefers the **Bearer token** (first 32 chars) as the bucket identifier for authenticated requests so each user gets their own counter regardless of IP — useful behind a shared NAT. Anonymous requests fall back to the client IP.

The in-memory store is used by default, which is sufficient for a single process. Swapping to Redis requires one line: `Limiter(key_func=..., storage_uri="redis://...")`. Limits are configurable at runtime via `LINK_SHORTENER_RATE_LIMIT_*` env vars.

### Password lock
Passwords are hashed with **bcrypt** before storage — the plain text never touches the database. The redirect endpoint (`GET /{code}`) returns `423 Locked` with a JSON body instead of a 301 when a link is locked; the frontend intercepts this at the `/unlock/{code}` page, collects the password, calls `POST /{code}/unlock`, and redirects client-side on success.

### Authentication
Auth is handled by **Clerk** via session JWTs. The backend SDK validates the JWT and extracts `sub` as the user ID. Both required and optional auth variants exist: optional auth lets anonymous users create links while authenticated users get ownership and deduplication.

### Database
**PostgreSQL** is the production target, configured via `LINK_SHORTENER_DATABASE_URL`. The validator normalises plain `postgresql://` URLs to `postgresql+psycopg://` automatically. Tests override the database dependency with an in-memory SQLite engine — no external service needed to run the test suite.

### Redirect response code
Redirects use **302 Found** (not 301 Moved Permanently). A 301 would be cached by browsers indefinitely, which would prevent click counts from updating on repeat visits. The `Cache-Control: no-store` header reinforces this.

### Migrations
Alembic is wired up. `alembic upgrade head` applies all migrations from a clean database. `init_db()` (called at startup) is a belt-and-suspenders `create_all` that handles dev/test environments where Alembic hasn't been run.

---

## With More Time

- **Rate limiting** per IP / per user on link creation using a Redis token bucket.
- **Click analytics** split into an append-only `click_events` table (timestamp, referrer, country) instead of a simple counter, enabling time-series charts on the dashboard.
- **Docker Compose** file combining the API, a PostgreSQL container, and the Next.js frontend for a fully local one-command setup.
- **Rust short-code generator** — the stretch goal in the task spec. The Base58 generation is trivially fast in Python at this scale, but wrapping a tiny `pyo3` module would be a fun exercise.
- **Custom domain support** so users could map their own domains to the shortener.

---

## Time Spent

Roughly **4–5 hours** spread across implementation (backend API + auth, password lock, tests), frontend integration (password unlock page, UI polish), and documentation.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `LINK_SHORTENER_DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `LINK_SHORTENER_CLERK_SECRET_KEY` | For auth | — | Clerk secret key |
| `LINK_SHORTENER_CLERK_JWT_KEY` | Optional | — | Clerk JWT verification key |
| `LINK_SHORTENER_CLERK_AUTHORIZED_PARTIES` | Optional | — | Comma-separated list of allowed JWT issuers |
| `LINK_SHORTENER_CORS_ALLOWED_ORIGINS` | Optional | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `LINK_SHORTENER_SHORT_CODE_LENGTH` | Optional | `7` | Generated code length |
| `LINK_SHORTENER_RATE_LIMIT_CREATE` | Optional | `10/minute` | Rate limit for `POST /links` |
| `LINK_SHORTENER_RATE_LIMIT_REDIRECT` | Optional | `60/minute` | Rate limit for `GET /{code}` |
| `LINK_SHORTENER_RATE_LIMIT_UNLOCK` | Optional | `5/minute` | Rate limit for `POST /{code}/unlock` |
