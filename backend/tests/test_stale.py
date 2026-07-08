from datetime import date, timedelta

from sqlalchemy import create_engine

from app.database import ensure_columns
from app.services.stale import months_ago

VALID_APPLICATION = {
    "company": "Acme Corp",
    "role": "Backend Engineer",
    "status": "applied",
    "applied_date": "2026-06-20",
}


def create_application(client, **overrides):
    payload = {**VALID_APPLICATION, **overrides}
    response = client.post("/api/applications", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def days_ago(days: int) -> str:
    return (date.today() - timedelta(days=days)).isoformat()


def stale_ids(client) -> list[int]:
    response = client.get("/api/applications/stale")
    assert response.status_code == 200, response.text
    return [a["id"] for a in response.json()]


def test_months_ago_calendar_math():
    assert months_ago(3, date(2026, 7, 8)) == date(2026, 4, 8)
    assert months_ago(3, date(2026, 1, 15)) == date(2025, 10, 15)  # year rollover
    assert months_ago(3, date(2026, 5, 31)) == date(2026, 2, 28)  # day clamped


def test_stale_lists_only_old_applied_applications(client):
    old = create_application(client, applied_date=days_ago(120))
    exactly_cutoff = create_application(
        client, company="Cutoff Co", applied_date=months_ago(3).isoformat()
    )
    create_application(client, company="Fresh Co", applied_date=days_ago(10))
    create_application(client, company="Interviewing", status="interview", applied_date=days_ago(120))
    create_application(client, company="Wishlisted", status="wishlist", applied_date=None)

    ids = stale_ids(client)
    assert ids == [old["id"], exactly_cutoff["id"]]  # oldest first


def test_stale_returns_card_shape(client):
    create_application(client, applied_date=days_ago(100))
    card = client.get("/api/applications/stale").json()[0]
    assert card["days_since_applied"] == 100
    assert card["company"] == "Acme Corp"


def test_snoozed_application_hidden_until_snooze_expires(client):
    app_id = create_application(client, applied_date=days_ago(120))["id"]

    future = (date.today() + timedelta(days=30)).isoformat()
    patched = client.patch(
        f"/api/applications/{app_id}", json={"stale_snoozed_until": future}
    )
    assert patched.status_code == 200
    assert patched.json()["stale_snoozed_until"] == future
    assert stale_ids(client) == []

    # An expired snooze surfaces the application again.
    client.patch(f"/api/applications/{app_id}", json={"stale_snoozed_until": days_ago(1)})
    assert stale_ids(client) == [app_id]


def test_ensure_columns_backfills_existing_database():
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.exec_driver_sql("CREATE TABLE applications (id INTEGER PRIMARY KEY)")

    ensure_columns(engine)
    ensure_columns(engine)  # idempotent

    with engine.connect() as conn:
        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(applications)")}
    assert "stale_snoozed_until" in columns
