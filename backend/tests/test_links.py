from datetime import datetime, timedelta, timezone

from link_shortener.auth import get_current_user_id, get_current_user_id_optional


def _set_required_user(client, user_id: str):
    app = client.app
    app.dependency_overrides[get_current_user_id] = lambda: user_id


def _set_optional_user(client, user_id: str):
    app = client.app
    app.dependency_overrides[get_current_user_id_optional] = lambda: user_id


def _clear_user(client):
    app = client.app
    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(get_current_user_id_optional, None)


def test_create_link_returns_short_url_and_stats(client):
    _set_optional_user(client, "user_test")
    try:
        response = client.post("/links", json={"url": "https://www.iitmandi.ac.in/"})

        assert response.status_code == 201
        body = response.json()
        assert body["original_url"] == "https://www.iitmandi.ac.in/"
        assert body["short_url"].endswith(f"/{body['code']}")
        assert body["click_count"] == 0

        _set_required_user(client, "user_test")

        stats = client.get(f"/links/{body['code']}/stats")
        assert stats.status_code == 200
        assert stats.json()["click_count"] == 0
    finally:
        _clear_user(client)


def test_redirect_records_click(client):
    _set_optional_user(client, "user_test")
    _set_required_user(client, "user_test")
    created = client.post("/links", json={"url": "https://example.com/docs"}).json()

    redirect = client.get(f"/{created['code']}", follow_redirects=False)

    assert redirect.status_code == 302
    assert redirect.headers["location"] == "https://example.com/docs"

    stats = client.get(f"/links/{created['code']}/stats")
    assert stats.json()["click_count"] == 1


def test_custom_code_conflict_returns_409(client):
    payload = {"url": "https://example.com/first", "custom_code": "iit-mandi"}
    assert client.post("/links", json=payload).status_code == 201

    response = client.post(
        "/links",
        json={"url": "https://example.com/second", "custom_code": "iit-mandi"},
    )

    assert response.status_code == 409


def test_same_url_is_idempotent(client):
    # Deduplication is per-owner, so we need an authenticated user.
    _set_optional_user(client, "user_idem")
    try:
        payload = {"url": "https://example.com/same"}

        first = client.post("/links", json=payload)
        second = client.post("/links", json=payload)

        assert first.status_code == 201
        assert second.status_code == 200
        assert first.json()["code"] == second.json()["code"]
    finally:
        _clear_user(client)


def test_anonymous_links_are_not_deduplicated(client):
    payload = {"url": "https://example.com/anonymous"}

    first = client.post("/links", json=payload)
    second = client.post("/links", json=payload)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["code"] != second.json()["code"]


def test_auth_me_returns_authenticated_user_id(client):
    _set_required_user(client, "user_test")
    try:
        response = client.get("/auth/me", headers={"Authorization": "Bearer test.jwt.token"})

        assert response.status_code == 200
        body = response.json()
        assert body["user_id"] == "user_test"
        assert body["authenticated"] is True
        # The API slices [:12] characters then appends "..."
        assert body["token_prefix"] == "test.jwt.tok..."
    finally:
        _clear_user(client)


def test_openapi_includes_bearer_security(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()

    # BearerAuth scheme is injected into the components
    assert schema["components"]["securitySchemes"]["BearerAuth"]["scheme"] == "bearer"
    # Authenticated list and stats endpoints carry BearerAuth
    assert {"BearerAuth": []} in schema["paths"]["/links"]["get"]["security"]
    assert {"BearerAuth": []} in schema["paths"]["/links/{code}/stats"]["get"]["security"]
    # /auth/me is tagged "auth" so it also receives BearerAuth via custom_openapi
    assert {"BearerAuth": []} in schema["paths"]["/auth/me"]["get"]["security"]


def test_paginated_list(client):
    _set_optional_user(client, "user_test")
    _set_required_user(client, "user_test")
    try:
        for index in range(3):
            client.post("/links", json={"url": f"https://example.com/{index}"})

        response = client.get("/links?page=1&page_size=2")

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 3
        assert body["page"] == 1
        assert body["page_size"] == 2
        assert len(body["items"]) == 2
    finally:
        _clear_user(client)


def test_links_are_scoped_to_owner(client):
    _set_optional_user(client, "user_test")
    try:
        created = client.post("/links", json={"url": "https://example.com/owned"}).json()

        app = client.app
        app.dependency_overrides[get_current_user_id] = lambda: "user_other"

        response = client.get("/links")

        assert response.status_code == 200
        assert response.json()["total"] == 0

        stats = client.get(f"/links/{created['code']}/stats")
        assert stats.status_code == 404
    finally:
        _clear_user(client)


def test_past_expiry_is_rejected(client):
    past_expiry = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    response = client.post("/links", json={"url": "https://example.com/past", "expires_at": past_expiry})

    assert response.status_code == 422


# ── Password-lock tests ────────────────────────────────────────────────────────

def test_locked_link_is_flagged_in_response(client):
    """Creating a link with a password sets is_locked=True in the response."""
    response = client.post(
        "/links",
        json={"url": "https://example.com/secret", "password": "hunter2"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["is_locked"] is True


def test_locked_link_redirect_returns_423(client):
    """GET /{code} on a locked link returns 423 instead of a redirect."""
    created = client.post(
        "/links",
        json={"url": "https://example.com/locked", "password": "s3cr3t"},
    ).json()

    response = client.get(f"/{created['code']}", follow_redirects=False)

    assert response.status_code == 423
    body = response.json()
    assert body["locked"] is True
    assert body["code"] == created["code"]


def test_unlock_with_correct_password_returns_url(client):
    """POST /{code}/unlock with the right password returns the destination URL."""
    created = client.post(
        "/links",
        json={"url": "https://example.com/guarded", "password": "open-sesame"},
    ).json()

    response = client.post(
        f"/{created['code']}/unlock",
        json={"password": "open-sesame"},
    )

    assert response.status_code == 200
    assert response.json()["url"] == "https://example.com/guarded"


def test_unlock_with_wrong_password_returns_401(client):
    """POST /{code}/unlock with a wrong password returns 401."""
    created = client.post(
        "/links",
        json={"url": "https://example.com/guarded2", "password": "correct"},
    ).json()

    response = client.post(
        f"/{created['code']}/unlock",
        json={"password": "wrong"},
    )

    assert response.status_code == 401
    assert "Incorrect" in response.json()["detail"]


def test_unlock_records_click(client):
    """A successful unlock increments the click counter."""
    _set_optional_user(client, "user_lock")
    _set_required_user(client, "user_lock")
    try:
        created = client.post(
            "/links",
            json={"url": "https://example.com/counted", "password": "clickme"},
        ).json()

        client.post(f"/{created['code']}/unlock", json={"password": "clickme"})

        stats = client.get(f"/links/{created['code']}/stats")
        assert stats.json()["click_count"] == 1
    finally:
        _clear_user(client)


def test_unlock_on_unlocked_link_returns_url(client):
    """POST /{code}/unlock on a non-locked link returns the URL without needing a password."""
    created = client.post(
        "/links",
        json={"url": "https://example.com/open"},
    ).json()

    response = client.post(
        f"/{created['code']}/unlock",
        json={"password": "any"},
    )

    assert response.status_code == 200
    assert response.json()["url"] == "https://example.com/open"


# ── Rate-limit tests ───────────────────────────────────────────────────────────

def test_create_link_rate_limit_trips_on_11th_request(client):
    """The 11th POST /links from the same client within a minute returns 429."""
    # The default limit is 10/minute.  We send 10 successful requests then
    # verify the 11th is rejected with the correct status and Retry-After header.
    limit = 10
    for i in range(limit):
        r = client.post("/links", json={"url": f"https://example.com/rl/{i}"})
        assert r.status_code in (200, 201), f"Request {i+1} unexpectedly failed: {r.status_code}"

    r = client.post("/links", json={"url": "https://example.com/rl/overflow"})
    assert r.status_code == 429
    assert "Retry-After" in r.headers
    assert "Rate limit exceeded" in r.json()["detail"]
