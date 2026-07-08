from datetime import date

from app.models import STATUSES

from .test_applications import create_application


def test_every_valid_status_is_accepted(client):
    created = create_application(client)
    for status in STATUSES:
        response = client.patch(
            f"/api/applications/{created['id']}/status", json={"status": status}
        )
        assert response.status_code == 200, f"{status}: {response.text}"
        assert response.json()["status"] == status


def test_invalid_status_rejected(client):
    created = create_application(client)
    response = client.patch(
        f"/api/applications/{created['id']}/status", json={"status": "hired"}
    )
    assert response.status_code == 422
    # record unchanged
    assert client.get(f"/api/applications/{created['id']}").json()["status"] == "applied"


def test_missing_status_body_rejected(client):
    created = create_application(client)
    response = client.patch(f"/api/applications/{created['id']}/status", json={})
    assert response.status_code == 422


def test_wishlist_to_applied_sets_applied_date(client):
    created = create_application(client, status="wishlist", applied_date=None)
    response = client.patch(
        f"/api/applications/{created['id']}/status", json={"status": "applied"}
    )
    assert response.status_code == 200
    assert response.json()["applied_date"] == date.today().isoformat()


def test_existing_applied_date_is_preserved(client):
    created = create_application(client, status="wishlist", applied_date="2026-01-15")
    response = client.patch(
        f"/api/applications/{created['id']}/status", json={"status": "applied"}
    )
    assert response.json()["applied_date"] == "2026-01-15"


def test_generic_patch_applies_the_same_transition_rule(client):
    """The detail page changes status via the generic PATCH; it must stamp
    applied_date exactly like the /status endpoint the board uses."""
    created = create_application(client, status="wishlist", applied_date=None)
    response = client.patch(f"/api/applications/{created['id']}", json={"status": "applied"})
    assert response.status_code == 200
    assert response.json()["applied_date"] == date.today().isoformat()


def test_generic_patch_preserves_existing_applied_date(client):
    created = create_application(client, status="wishlist", applied_date="2026-01-15")
    response = client.patch(f"/api/applications/{created['id']}", json={"status": "applied"})
    assert response.json()["applied_date"] == "2026-01-15"


def test_leaving_wishlist_for_any_status_sets_applied_date(client):
    """Dragging wishlist -> phone_screen (skipping 'applied') still means an
    application happened, so the date is stamped."""
    created = create_application(client, status="wishlist", applied_date=None)
    response = client.patch(
        f"/api/applications/{created['id']}/status", json={"status": "phone_screen"}
    )
    assert response.status_code == 200
    assert response.json()["applied_date"] == date.today().isoformat()


def test_generic_patch_explicit_applied_date_wins_over_stamp(client):
    created = create_application(client, status="wishlist", applied_date=None)
    response = client.patch(
        f"/api/applications/{created['id']}",
        json={"status": "applied", "applied_date": "2026-06-01"},
    )
    assert response.json()["applied_date"] == "2026-06-01"
