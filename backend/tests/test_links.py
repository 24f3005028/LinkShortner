from datetime import datetime, timedelta, timezone


def test_create_link_returns_short_url_and_stats(client):
    response = client.post("/links", json={"url": "https://www.iitmandi.ac.in/"})

    assert response.status_code == 201
    body = response.json()
    assert body["original_url"] == "https://www.iitmandi.ac.in/"
    assert body["short_url"].endswith(f"/{body['code']}")
    assert body["click_count"] == 0

    stats = client.get(f"/links/{body['code']}/stats")
    assert stats.status_code == 200
    assert stats.json()["click_count"] == 0


def test_redirect_records_click(client):
    created = client.post("/links", json={"url": "https://example.com/docs"}).json()

    redirect = client.get(f"/{created['code']}", follow_redirects=False)

    assert redirect.status_code == 301
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


def test_paginated_list(client):
    for index in range(3):
        client.post("/links", json={"url": f"https://example.com/{index}"})

    response = client.get("/links?page=1&page_size=2")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["page"] == 1
    assert body["page_size"] == 2
    assert len(body["items"]) == 2


def test_past_expiry_is_rejected(client):
    past_expiry = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    response = client.post("/links", json={"url": "https://example.com/past", "expires_at": past_expiry})

    assert response.status_code == 422
