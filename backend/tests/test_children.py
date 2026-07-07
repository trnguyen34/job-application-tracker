"""CRUD tests for contacts, interview rounds, notes, and reminders.

The four child entities share the same nested-router pattern, so the tests
are parametrized over a small spec for each entity.
"""

import pytest

from .test_applications import create_application

CHILD_SPECS = {
    "contacts": {
        "create": {"name": "Jane Recruiter", "email": "jane@acme.example"},
        "update": {"phone": "+1 555 0100"},
        "invalid": {"name": ""},
        "check_field": ("email", "jane@acme.example"),
    },
    "interviews": {
        "create": {"round_type": "technical", "interviewers": "Alice, Bob"},
        "update": {"outcome": "passed"},
        "invalid": {"round_type": "vibes"},
        "check_field": ("interviewers", "Alice, Bob"),
    },
    "notes": {
        "create": {"body": "Followed up with the recruiter."},
        "update": {"body": "Recruiter replied; onsite next week."},
        "invalid": {"body": ""},
        "check_field": ("body", "Followed up with the recruiter."),
    },
    "reminders": {
        "create": {"due_date": "2026-08-01", "description": "Send thank-you email"},
        "update": {"done": True},
        "invalid": {"description": "no due date"},
        "check_field": ("description", "Send thank-you email"),
    },
}

MUTATE_PREFIX = {
    "contacts": "contacts",
    "interviews": "interviews",
    "notes": "notes",
    "reminders": "reminders",
}


@pytest.mark.parametrize("entity", CHILD_SPECS)
def test_child_crud_lifecycle(client, entity):
    spec = CHILD_SPECS[entity]
    application = create_application(client)
    base = f"/api/applications/{application['id']}/{entity}"

    # create
    created = client.post(base, json=spec["create"])
    assert created.status_code == 201, created.text
    child = created.json()
    field, expected = spec["check_field"]
    assert child[field] == expected
    assert child["application_id"] == application["id"]

    # list
    listed = client.get(base)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    # update
    updated = client.patch(f"/api/{MUTATE_PREFIX[entity]}/{child['id']}", json=spec["update"])
    assert updated.status_code == 200, updated.text
    for key, value in spec["update"].items():
        assert updated.json()[key] == value

    # delete
    assert client.delete(f"/api/{MUTATE_PREFIX[entity]}/{child['id']}").status_code == 204
    assert client.get(base).json() == []


@pytest.mark.parametrize("entity", CHILD_SPECS)
def test_child_create_validation_error(client, entity):
    spec = CHILD_SPECS[entity]
    application = create_application(client)
    response = client.post(
        f"/api/applications/{application['id']}/{entity}", json=spec["invalid"]
    )
    assert response.status_code == 422


@pytest.mark.parametrize("entity", CHILD_SPECS)
def test_child_routes_404s(client, entity):
    spec = CHILD_SPECS[entity]
    # unknown application
    assert client.get(f"/api/applications/999/{entity}").status_code == 404
    assert client.post(f"/api/applications/999/{entity}", json=spec["create"]).status_code == 404
    # unknown child
    assert client.patch(f"/api/{MUTATE_PREFIX[entity]}/999", json=spec["update"]).status_code == 404
    assert client.delete(f"/api/{MUTATE_PREFIX[entity]}/999").status_code == 404


def test_detail_includes_children(client):
    application = create_application(client)
    app_id = application["id"]
    client.post(f"/api/applications/{app_id}/contacts", json={"name": "Jane"})
    client.post(f"/api/applications/{app_id}/notes", json={"body": "hello"})
    client.post(
        f"/api/applications/{app_id}/reminders",
        json={"due_date": "2026-08-01", "description": "follow up"},
    )
    client.post(f"/api/applications/{app_id}/interviews", json={"round_type": "phone_screen"})

    detail = client.get(f"/api/applications/{app_id}").json()
    assert len(detail["contacts"]) == 1
    assert len(detail["notes"]) == 1
    assert len(detail["reminders"]) == 1
    assert len(detail["interview_rounds"]) == 1
