"""Dashboard aggregations.

Average response time is defined as the mean number of days between an
application's applied_date and its earliest interview round (scheduled_at),
over applications that have both. It approximates "how long until they
first talked to me".
"""

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models

ACTIVE_STATUSES = ("applied", "phone_screen", "interview", "offer")


def week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def compute_stats(db: Session) -> dict:
    applications = db.scalars(select(models.Application)).all()

    total = len(applications)
    active = sum(1 for a in applications if a.status in ACTIVE_STATUSES)
    offers = sum(1 for a in applications if a.status in ("offer", "accepted"))
    rejected = sum(1 for a in applications if a.status == "rejected")

    # Weekly counts keyed on the Monday of each applied week.
    weekly: dict[date, int] = {}
    for a in applications:
        if a.applied_date:
            key = week_start(a.applied_date)
            weekly[key] = weekly.get(key, 0) + 1
    applications_over_time = [
        {"week": week.isoformat(), "count": count} for week, count in sorted(weekly.items())
    ]

    # Funnel in pipeline order; only statuses that occur are omitted? No —
    # always emit the full pipeline so the chart has stable categories.
    counts_by_status = {
        status: sum(1 for a in applications if a.status == status)
        for status in models.STATUSES
    }
    status_funnel = [
        {"status": status, "count": counts_by_status[status]} for status in models.STATUSES
    ]

    by_source_rows = db.execute(
        select(models.Application.source, func.count())
        .group_by(models.Application.source)
        .order_by(func.count().desc())
    ).all()
    by_source = [
        {"source": source or "Unknown", "count": count} for source, count in by_source_rows
    ]

    first_round_by_app = dict(
        db.execute(
            select(
                models.InterviewRound.application_id,
                func.min(models.InterviewRound.scheduled_at),
            ).group_by(models.InterviewRound.application_id)
        ).all()
    )
    response_days = [
        (first_round.date() - a.applied_date).days
        for a in applications
        if a.applied_date and (first_round := first_round_by_app.get(a.id)) is not None
    ]
    avg_response_time_days = (
        round(sum(response_days) / len(response_days), 1) if response_days else None
    )

    return {
        "totals": {"total": total, "active": active, "offers": offers, "rejected": rejected},
        "applications_over_time": applications_over_time,
        "status_funnel": status_funnel,
        "by_source": by_source,
        "avg_response_time_days": avg_response_time_days,
    }
