from datetime import date, timedelta

from .test_applications import create_application

TODAY = date.today()
# Anchor everything to Mondays so weekly buckets are deterministic.
THIS_MONDAY = TODAY - timedelta(days=TODAY.weekday())


def iso(d: date) -> str:
    return d.isoformat()


def seed_known_dataset(client):
    """3 applied same week, 1 the week before, plus offer/rejected/wishlist."""
    week_ago = THIS_MONDAY - timedelta(days=7)

    a1 = create_application(
        client, status="applied", applied_date=iso(THIS_MONDAY), source="LinkedIn"
    )
    a2 = create_application(
        client,
        status="interview",
        applied_date=iso(THIS_MONDAY + timedelta(days=1)),
        source="LinkedIn",
    )
    create_application(
        client,
        status="applied",
        applied_date=iso(THIS_MONDAY + timedelta(days=2)),
        source="Referral",
    )
    a4 = create_application(client, status="offer", applied_date=iso(week_ago), source="Referral")
    create_application(client, status="rejected", applied_date=iso(week_ago), source="LinkedIn")
    create_application(client, status="wishlist", applied_date=None, source=None)

    # interview rounds: a2 responded in 4 days, a4 in 6 -> avg 5.0
    client.post(
        f"/api/applications/{a2['id']}/interviews",
        json={
            "round_type": "phone_screen",
            "scheduled_at": f"{iso(THIS_MONDAY + timedelta(days=5))}T10:00:00",
        },
    )
    client.post(
        f"/api/applications/{a4['id']}/interviews",
        json={
            "round_type": "technical",
            "scheduled_at": f"{iso(week_ago + timedelta(days=6))}T15:00:00",
        },
    )
    # a second, later round on a2 must not affect "first response"
    client.post(
        f"/api/applications/{a2['id']}/interviews",
        json={
            "round_type": "onsite",
            "scheduled_at": f"{iso(THIS_MONDAY + timedelta(days=12))}T09:00:00",
        },
    )
    return a1


def test_stats_empty_database(client):
    stats = client.get("/api/stats").json()
    assert stats["totals"] == {"total": 0, "active": 0, "offers": 0, "rejected": 0}
    assert stats["applications_over_time"] == []
    assert all(bucket["count"] == 0 for bucket in stats["status_funnel"])
    assert stats["by_source"] == []
    assert stats["avg_response_time_days"] is None


def test_stats_aggregates_known_dataset(client):
    seed_known_dataset(client)
    stats = client.get("/api/stats").json()

    assert stats["totals"] == {"total": 6, "active": 4, "offers": 1, "rejected": 1}

    weeks = {row["week"]: row["count"] for row in stats["applications_over_time"]}
    assert weeks == {
        iso(THIS_MONDAY - timedelta(days=7)): 2,
        iso(THIS_MONDAY): 3,
    }

    funnel = {row["status"]: row["count"] for row in stats["status_funnel"]}
    assert funnel["applied"] == 2
    assert funnel["interview"] == 1
    assert funnel["offer"] == 1
    assert funnel["rejected"] == 1
    assert funnel["wishlist"] == 1
    assert funnel["ghosted"] == 0

    sources = {row["source"]: row["count"] for row in stats["by_source"]}
    assert sources == {"LinkedIn": 3, "Referral": 2, "Unknown": 1}

    assert stats["avg_response_time_days"] == 5.0
