# Link Shortener API

A small FastAPI + SQLAlchemy link-shortener service for the Simhatel Technology take-home task. It creates readable short links, redirects by code, tracks clicks, and exposes stats plus a paginated list endpoint.

## Tech Stack

- FastAPI with OpenAPI docs at `/docs`
- SQLAlchemy ORM
- PostgreSQL for persistence
- Pytest for endpoint coverage
- Dockerfile for containerized runs

## Configuration

Set `LINK_SHORTENER_DATABASE_URL` before starting the API. The recommended format is:

```bash
postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
```

Plain `postgresql://...` URLs are also accepted and normalized to the `psycopg` SQLAlchemy driver.

PowerShell example:

```powershell
$env:LINK_SHORTENER_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/link_shortener"
```

## Run Locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

## Run With Docker

```bash
docker build -t link-shortener .
docker run --rm -p 8000:8000 ^
  -e LINK_SHORTENER_DATABASE_URL="postgresql+psycopg://postgres:postgres@host.docker.internal:5432/link_shortener" ^
  link-shortener
```

## Run Tests

```bash
pytest
```

Tests use an isolated in-memory database override, so they do not require your local PostgreSQL instance.

## Example API Calls

Create a generated short code:

```bash
curl -X POST http://127.0.0.1:8000/links ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://www.iitmandi.ac.in/\"}"
```

Create a custom short code:

```bash
curl -X POST http://127.0.0.1:8000/links ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://example.com/docs\",\"custom_code\":\"docs\"}"
```

Redirect without following it:

```bash
curl -i http://127.0.0.1:8000/docs
```

Fetch stats:

```bash
curl http://127.0.0.1:8000/links/docs/stats
```

List links:

```bash
curl "http://127.0.0.1:8000/links?page=1&page_size=20"
```

## Decisions

- PostgreSQL is the application database target, configured through `LINK_SHORTENER_DATABASE_URL` so credentials stay out of source control.
- The app uses SQLAlchemy ORM models and creates tables on startup for this compact assignment. In production I would replace this with Alembic migrations.
- Generated codes use a Base58 alphabet, avoiding visually confusing characters like `0`, `O`, `I`, and `l`.
- Short-code generation is non-predictable and retries on collisions. For idempotency, posting the same long URL returns the existing link.
- Redirects return `301 Moved Permanently`, following the system-design reference, with `Cache-Control: no-store` so local clients and tests do not hide future click tracking.
- Expired links return `410 Gone`; missing links return `404 Not Found`.

## System Design Notes

The referenced URL-shortener design emphasizes a read-heavy service, short readable codes, collision avoidance, redirect analytics, and simple URL-table storage. This implementation keeps those ideas but scopes them to the assignment: one PostgreSQL-backed `links` table, indexed code lookup, click counting on redirect, and no separate cache or user ownership.

Reference: https://systemdesign.one/url-shortening-system-design/

## With More Time

- Add JWT auth and make links owned by users.
- Add Alembic migrations instead of relying on `create_all`.
- Add Docker Compose with Postgres for a full local stack.
- Add rate limiting and structured logging.
- Split click analytics into append-only events if real reporting were required.

## Time Spent

Roughly 3-4 focused hours for implementation, tests, Docker setup, and documentation.
