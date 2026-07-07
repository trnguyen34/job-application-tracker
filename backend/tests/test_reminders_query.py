from datetime import date, timedelta

from .test_applications import create_application

TODAY = date.today()


def iso(delta_days: int) -> str:
    return (TODAY + timedelta(days=delta_days)).isoformat()


def seed_reminders(client):
    application = create_application(client)
    app_id = application["id"]

    def add(due: str, description: str, done: bool = False) -> dict:
        return client.post(
            f"/api/applications/{app_id}/reminders",
            json={"due_date": due, "description": description, "done": done},
        ).json()

    add(iso(-3), "overdue follow-up")
    add(iso(0), "due today")
    add(iso(5), "due soon")
    add(iso(30), "far future")
    add(iso(1), "already handled", done=True)
    return app_id


def test_upcoming_includes_overdue_and_window_only(client):
    seed_reminders(client)
    rows = client.get("/api/reminders", params={"upcoming": True, "days": 14}).json()
    descriptions = [r["description"] for r in rows]
    # ordered by due date; done and far-future excluded, overdue included
    assert descriptions == ["overdue follow-up", "due today", "due soon"]


def test_upcoming_window_is_configurable(client):
    seed_reminders(client)
    rows = client.get("/api/reminders", params={"upcoming": True, "days": 60}).json()
    assert [r["description"] for r in rows] == [
        "overdue follow-up",
        "due today",
        "due soon",
        "far future",
    ]


def test_flat_list_includes_company_and_role(client):
    seed_reminders(client)
    rows = client.get("/api/reminders", params={"upcoming": True}).json()
    assert rows[0]["company"] == "Acme Corp"
    assert rows[0]["role"] == "Backend Engineer"


def test_unfiltered_list_returns_everything(client):
    seed_reminders(client)
    rows = client.get("/api/reminders").json()
    assert len(rows) == 5


def test_marking_reminder_done_removes_it_from_upcoming(client):
    app_id = seed_reminders(client)
    rows = client.get("/api/reminders", params={"upcoming": True, "days": 14}).json()
    target = next(r for r in rows if r["description"] == "due today")

    done = client.patch(f"/api/reminders/{target['id']}", json={"done": True})
    assert done.status_code == 200
    assert done.json()["done"] is True

    remaining = client.get("/api/reminders", params={"upcoming": True, "days": 14}).json()
    assert all(r["description"] != "due today" for r in remaining)
    # still visible on the application itself
    app_reminders = client.get(f"/api/applications/{app_id}/reminders").json()
    assert len(app_reminders) == 5
