VALID_APPLICATION = {
    "company": "Acme Corp",
    "role": "Backend Engineer",
    "status": "applied",
    "applied_date": "2026-06-20",
    "job_url": "https://acme.example/jobs/42",
    "location": "San Francisco, CA",
    "work_mode": "hybrid",
    "salary_min": 150000,
    "salary_max": 190000,
    "salary_currency": "USD",
    "source": "LinkedIn",
    "priority": "high",
}


def create_application(client, **overrides):
    payload = {**VALID_APPLICATION, **overrides}
    response = client.post("/api/applications", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_get_application(client):
    created = create_application(client)
    assert created["id"] == 1
    assert created["company"] == "Acme Corp"
    assert created["created_at"] is not None

    fetched = client.get(f"/api/applications/{created['id']}")
    assert fetched.status_code == 200
    detail = fetched.json()
    assert detail["role"] == "Backend Engineer"
    assert detail["contacts"] == []
    assert detail["reminders"] == []


def test_create_minimal_application_defaults(client):
    response = client.post(
        "/api/applications", json={"company": "Tiny Co", "role": "Engineer"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "wishlist"
    assert body["priority"] == "medium"
    assert body["salary_currency"] == "USD"
    assert body["applied_date"] is None


def test_create_application_validation_errors(client):
    assert client.post("/api/applications", json={"company": "X"}).status_code == 422
    assert (
        client.post(
            "/api/applications",
            json={"company": "X", "role": "Y", "status": "not-a-status"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/applications",
            json={"company": "X", "role": "Y", "salary_min": 200, "salary_max": 100},
        ).status_code
        == 422
    )


def test_list_applications_with_filters(client):
    create_application(client, company="Acme Corp", status="applied", source="LinkedIn")
    create_application(client, company="Beta Inc", status="interview", source="Referral")
    create_application(client, company="Gamma LLC", status="applied", source="LinkedIn")

    assert len(client.get("/api/applications").json()) == 3
    assert len(client.get("/api/applications", params={"status": "applied"}).json()) == 2
    assert len(client.get("/api/applications", params={"source": "Referral"}).json()) == 1
    assert len(client.get("/api/applications", params={"search": "gam"}).json()) == 1


def test_list_computes_days_since_applied(client):
    from datetime import date, timedelta

    ten_days_ago = (date.today() - timedelta(days=10)).isoformat()
    create_application(client, applied_date=ten_days_ago)
    card = client.get("/api/applications").json()[0]
    assert card["days_since_applied"] == 10


def test_update_application(client):
    created = create_application(client)
    response = client.patch(
        f"/api/applications/{created['id']}",
        json={"location": "Remote", "work_mode": "remote"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["location"] == "Remote"
    assert body["work_mode"] == "remote"
    assert body["company"] == "Acme Corp"  # untouched fields preserved


def test_delete_application(client):
    created = create_application(client)
    assert client.delete(f"/api/applications/{created['id']}").status_code == 204
    assert client.get(f"/api/applications/{created['id']}").status_code == 404


def test_missing_application_returns_404(client):
    assert client.get("/api/applications/999").status_code == 404
    assert client.patch("/api/applications/999", json={"company": "X"}).status_code == 404
    assert client.delete("/api/applications/999").status_code == 404
    assert (
        client.patch("/api/applications/999/status", json={"status": "applied"}).status_code
        == 404
    )
