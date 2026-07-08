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
    response_days = []
    for a in applications:
        first_round = first_round_by_app.get(a.id)
        if a.applied_date is None or first_round is None:
            continue
        delta = (first_round.date() - a.applied_date).days
        # An interview logged before the applied date is bad data, not a
        # negative response time — leave it out of the average.
        if delta >= 0:
            response_days.append(delta)
    avg_response_time_days = (
        round(sum(response_days) / len(response_days), 1) if response_days else None
    )

    # Daily applied counts feeding the dashboard's activity heatmap. The
    # grid shows 53 weeks ending in the current week, so 371 days covers
    # every visible cell; days with no applications are omitted.
    window_start = date.today() - timedelta(days=370)
    daily: dict[date, int] = {}
    for a in applications:
        if a.applied_date and a.applied_date >= window_start:
            daily[a.applied_date] = daily.get(a.applied_date, 0) + 1
    applications_per_day = [
        {"date": day.isoformat(), "count": count} for day, count in sorted(daily.items())
    ]

    return {
        "totals": {"total": total, "active": active, "offers": offers, "rejected": rejected},
        "applications_over_time": applications_over_time,
        "applications_per_day": applications_per_day,
        "status_funnel": status_funnel,
        "by_source": by_source,
        "avg_response_time_days": avg_response_time_days,
    }
