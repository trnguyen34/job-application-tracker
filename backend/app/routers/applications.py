from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["applications"])

PRIORITY_ORDER = case(
    (models.Application.priority == "high", 0),
    (models.Application.priority == "medium", 1),
    else_=2,
)


def get_application_or_404(db: Session, application_id: int) -> models.Application:
    application = db.get(models.Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


def apply_status_change(application: models.Application, new_status: str) -> None:
    """Single home for the transition rule, shared by the generic PATCH and
    the /status endpoint: leaving wishlist for any other status stamps
    applied_date, unless a date is already set. (Skipping straight from
    wishlist to e.g. interview still means an application happened.)"""
    if (
        application.status == "wishlist"
        and new_status != "wishlist"
        and application.applied_date is None
    ):
        application.applied_date = date.today()
    application.status = new_status


def _to_card(application: models.Application) -> schemas.ApplicationCard:
    card = schemas.ApplicationCard.model_validate(application)
    if application.applied_date is not None:
        card.days_since_applied = (date.today() - application.applied_date).days
    pending_reminders = sorted(
        (r for r in application.reminders if not r.done), key=lambda r: r.due_date
    )
    if pending_reminders:
        card.next_reminder = schemas.ReminderBrief.model_validate(pending_reminders[0])
    now = datetime.now()
    upcoming_rounds = sorted(
        (
            r
            for r in application.interview_rounds
            if r.outcome == "pending" and r.scheduled_at is not None and r.scheduled_at >= now
        ),
        key=lambda r: r.scheduled_at,
    )
    if upcoming_rounds:
        card.next_interview = schemas.InterviewBrief.model_validate(upcoming_rounds[0])
    return card


@router.get("/applications", response_model=list[schemas.ApplicationCard])
def list_applications(
    status: schemas.Status | None = None,
    source: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        select(models.Application)
        .options(
            selectinload(models.Application.reminders),
            selectinload(models.Application.interview_rounds),
        )
        .order_by(PRIORITY_ORDER, models.Application.applied_date.desc().nulls_last())
    )
    if status is not None:
        query = query.where(models.Application.status == status)
    if source is not None:
        query = query.where(models.Application.source == source)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            models.Application.company.ilike(pattern) | models.Application.role.ilike(pattern)
        )
    return [_to_card(a) for a in db.scalars(query).all()]


@router.post("/applications", response_model=schemas.ApplicationRead, status_code=201)
def create_application(payload: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    application = models.Application(**payload.model_dump())
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/applications/{application_id}", response_model=schemas.ApplicationDetail)
def get_application(application_id: int, db: Session = Depends(get_db)):
    return get_application_or_404(db, application_id)


@router.patch("/applications/{application_id}", response_model=schemas.ApplicationRead)
def update_application(
    application_id: int, payload: schemas.ApplicationUpdate, db: Session = Depends(get_db)
):
    application = get_application_or_404(db, application_id)
    updates = payload.model_dump(exclude_unset=True)

    # Validate the merged salary range: a partial update can invert it even
    # when each payload value is valid on its own.
    new_min = updates.get("salary_min", application.salary_min)
    new_max = updates.get("salary_max", application.salary_max)
    if new_min is not None and new_max is not None and new_min > new_max:
        raise HTTPException(status_code=422, detail="salary_min must be <= salary_max")

    new_status = updates.pop("status", None)
    for field, value in updates.items():
        setattr(application, field, value)
    if new_status is not None:
        apply_status_change(application, new_status)
    db.commit()
    db.refresh(application)
    return application


@router.delete("/applications/{application_id}", status_code=204)
def delete_application(application_id: int, db: Session = Depends(get_db)):
    from ..services import files

    application = get_application_or_404(db, application_id)
    files.delete_application_files(application)
    db.delete(application)
    db.commit()


@router.patch("/applications/{application_id}/status", response_model=schemas.ApplicationRead)
def update_status(
    application_id: int, payload: schemas.StatusUpdate, db: Session = Depends(get_db)
):
    application = get_application_or_404(db, application_id)
    apply_status_change(application, payload.status)
    db.commit()
    db.refresh(application)
    return application
