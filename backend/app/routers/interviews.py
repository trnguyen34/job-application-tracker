from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .applications import get_application_or_404

router = APIRouter(prefix="/api", tags=["interviews"])


def get_interview_or_404(db: Session, interview_id: int) -> models.InterviewRound:
    interview = db.get(models.InterviewRound, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview round not found")
    return interview


@router.get(
    "/applications/{application_id}/interviews", response_model=list[schemas.InterviewRead]
)
def list_interviews(application_id: int, db: Session = Depends(get_db)):
    get_application_or_404(db, application_id)
    return db.scalars(
        select(models.InterviewRound)
        .where(models.InterviewRound.application_id == application_id)
        .order_by(models.InterviewRound.scheduled_at.asc().nulls_last())
    ).all()


@router.post(
    "/applications/{application_id}/interviews",
    response_model=schemas.InterviewRead,
    status_code=201,
)
def create_interview(
    application_id: int, payload: schemas.InterviewCreate, db: Session = Depends(get_db)
):
    get_application_or_404(db, application_id)
    interview = models.InterviewRound(application_id=application_id, **payload.model_dump())
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


@router.patch("/interviews/{interview_id}", response_model=schemas.InterviewRead)
def update_interview(
    interview_id: int, payload: schemas.InterviewUpdate, db: Session = Depends(get_db)
):
    interview = get_interview_or_404(db, interview_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    return interview


@router.delete("/interviews/{interview_id}", status_code=204)
def delete_interview(interview_id: int, db: Session = Depends(get_db)):
    db.delete(get_interview_or_404(db, interview_id))
    db.commit()
