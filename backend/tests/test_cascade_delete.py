from sqlalchemy import func, select

from app import models

from .test_applications import create_application


def test_deleting_application_cascades_to_children(client, db_session):
    application = create_application(client)
    app_id = application["id"]

    contact = client.post(
        f"/api/applications/{app_id}/contacts", json={"name": "Jane"}
    ).json()
    interview = client.post(
        f"/api/applications/{app_id}/interviews", json={"round_type": "technical"}
    ).json()
    note = client.post(f"/api/applications/{app_id}/notes", json={"body": "note"}).json()
    reminder = client.post(
        f"/api/applications/{app_id}/reminders",
        json={"due_date": "2026-08-01", "description": "follow up"},
    ).json()

    assert client.delete(f"/api/applications/{app_id}").status_code == 204

    # children gone via API
    assert client.patch(f"/api/contacts/{contact['id']}", json={}).status_code == 404
    assert client.patch(f"/api/interviews/{interview['id']}", json={}).status_code == 404
    assert client.patch(f"/api/notes/{note['id']}", json={"body": "x"}).status_code == 404
    assert client.patch(f"/api/reminders/{reminder['id']}", json={}).status_code == 404

    # and gone at the database level (FK cascade, not just ORM)
    for model in (models.Contact, models.InterviewRound, models.Note, models.Reminder):
        assert db_session.scalar(select(func.count()).select_from(model)) == 0


def test_db_level_cascade_with_raw_delete(client, db_session):
    """Delete bypassing the ORM cascade to prove PRAGMA foreign_keys works."""
    application = create_application(client)
    app_id = application["id"]
    client.post(f"/api/applications/{app_id}/notes", json={"body": "note"})

    db_session.execute(
        models.Application.__table__.delete().where(models.Application.id == app_id)
    )
    db_session.commit()
    assert db_session.scalar(select(func.count()).select_from(models.Note)) == 0
