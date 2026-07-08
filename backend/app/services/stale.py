"""Launch-time staleness check: applications sitting in the Applied column
with no movement, judged by applied_date. The cutoff is calendar months
rather than a flat 90 days — "applied three months ago" the way a person
means it — with day-of-month clamping (May 31 → Feb 28)."""

import calendar
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models

STALE_MONTHS = 3


def months_ago(months: int, today: date | None = None) -> date:
    if today is None:
        today = date.today()
    index = today.year * 12 + today.month - 1 - months
    year, month = divmod(index, 12)
    month += 1
    day = min(today.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def stale_applications(
    db: Session, months: int = STALE_MONTHS
) -> list[models.Application]:
    """Applications still in Applied whose applied_date is `months`+ months
    back, excluding ones snoozed into the future ("Ignore for…" in the
    launch prompt); expired snoozes surface again. Oldest first."""
    today = date.today()
    cutoff = months_ago(months, today)
    query = (
        select(models.Application)
        .options(
            selectinload(models.Application.reminders),
            selectinload(models.Application.interview_rounds),
        )
        .where(
            models.Application.status == "applied",
            models.Application.applied_date.is_not(None),
            models.Application.applied_date <= cutoff,
            models.Application.stale_snoozed_until.is_(None)
            | (models.Application.stale_snoozed_until <= today),
        )
        .order_by(models.Application.applied_date.asc())
    )
    return list(db.scalars(query).all())
