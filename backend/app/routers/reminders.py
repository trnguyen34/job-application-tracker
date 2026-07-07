from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .applications import get_application_or_404

router = APIRouter(prefix="/api", tags=["reminders"])


def get_reminder_or_404(db: Session, reminder_id: int) -> models.Reminder:
    reminder = db.get(models.Reminder, reminder_id)
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


@router.get("/reminders", response_model=list[schemas.ReminderWithApplication])
def list_all_reminders(
    upcoming: bool = False, days: int = 14, db: Session = Depends(get_db)
):
    """Flat reminder list for the dashboard, joined with company/role.

    With upcoming=true, returns undone reminders due within `days` days —
    including overdue ones.
    """
    query = (
        select(models.Reminder, models.Application.company, models.Application.role)
        .join(models.Application)
        .order_by(models.Reminder.due_date)
    )
    if upcoming:
        cutoff = date.today() + timedelta(days=days)
        query = query.where(
            models.Reminder.done.is_(False), models.Reminder.due_date <= cutoff
        )
    rows = db.execute(query).all()
    return [
        schemas.ReminderWithApplication(
            **schemas.ReminderRead.model_validate(reminder).model_dump(),
            company=company,
            role=role,
        )
        for reminder, company, role in rows
    ]


@router.get(
    "/applications/{application_id}/reminders", response_model=list[schemas.ReminderRead]
)
def list_reminders(application_id: int, db: Session = Depends(get_db)):
    get_application_or_404(db, application_id)
    return db.scalars(
        select(models.Reminder)
        .where(models.Reminder.application_id == application_id)
        .order_by(models.Reminder.done, models.Reminder.due_date)
    ).all()


@router.post(
    "/applications/{application_id}/reminders",
    response_model=schemas.ReminderRead,
    status_code=201,
)
def create_reminder(
    application_id: int, payload: schemas.ReminderCreate, db: Session = Depends(get_db)
):
    get_application_or_404(db, application_id)
    reminder = models.Reminder(application_id=application_id, **payload.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.patch("/reminders/{reminder_id}", response_model=schemas.ReminderRead)
def update_reminder(
    reminder_id: int, payload: schemas.ReminderUpdate, db: Session = Depends(get_db)
):
    reminder = get_reminder_or_404(db, reminder_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    db.delete(get_reminder_or_404(db, reminder_id))
    db.commit()
