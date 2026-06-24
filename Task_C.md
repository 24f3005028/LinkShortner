# Take-Home Task — Full Stack Engineering Intern
## Simhatel Technology Pvt. Ltd. — IIT Mandi, Himachal Pradesh

This task focuses on backend depth in our real stack: **FastAPI + Python, Docker, tests**. We care more about clean, working, well-structured code than feature count.

**Submission:**
- A **public GitHub repo** with a clear commit history (small, meaningful commits + at least one PR you open & merge yourself).
- A `README.md`: how to run it, decisions you made, and what you'd do with more time.
- *(Optional but encouraged)* A short 2–3 min Loom/screen recording walking through the app and code.
- **Timebox: 1–2 days.** Tell us in the README roughly how long it took. Keep the scope tight — a clean, tested API beats a feature-heavy one.

---

## Your Task — FastAPI Link-Shortener Service

Build a **"Link Shortener" REST API** in **FastAPI**:

- `POST /links` (create short code), `GET /{code}` (redirect), `GET /links/{code}/stats` (click count), and a paginated list endpoint.
- Pydantic schemas, proper validation & error handling, OpenAPI docs working at `/docs`.
- Persistence via SQLAlchemy (SQLite is fine — no need for a separate DB server).
- A `Dockerfile`, and a few **pytest** tests covering the core endpoints.
- README with example `curl` calls.

**Stretch (only if you have time — not expected):** JWT auth so links are owned by a user; docker-compose with Postgres; rate-limiting; or reimplement the short-code generation as a small **Rust** module/CLI called from Python.

---

### How we'll evaluate
| Area | What we look for |
|------|------------------|
| Correctness | It runs from a clean clone following your README. |
| Structure | Sensible module layout; clean separation of routes/models/logic. |
| Code quality | Readable, typed, consistent; no dead/AI-boilerplate left in. |
| Git | Incremental commits, a real PR, clear messages. |
| Docker & tests | Builds & runs from the Dockerfile; pytest passes. |
| Communication | A clear README explaining *why*, not just *what* (recording optional). |

Strong submissions move to a short code-walkthrough interview.
