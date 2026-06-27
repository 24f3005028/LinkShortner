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
    payload = {"url": "https://example.com/same"}

    first = client.post("/links", json=payload)
    second = client.post("/links", json=payload)

    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["code"] == second.json()["code"]


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
        assert body["token_prefix"] == "test.jwt.toke..."
    finally:
        _clear_user(client)


def test_openapi_includes_bearer_security(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()

    assert schema["components"]["securitySchemes"]["BearerAuth"]["scheme"] == "bearer"
    assert {"BearerAuth": []} in schema["paths"]["/links"]["get"]["security"]
    assert {"BearerAuth": []} in schema["paths"]["/links/{code}/stats"]["get"]["security"]
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
