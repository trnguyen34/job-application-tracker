from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .applications import get_application_or_404

router = APIRouter(prefix="/api", tags=["notes"])


def get_note_or_404(db: Session, note_id: int) -> models.Note:
    note = db.get(models.Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.get("/applications/{application_id}/notes", response_model=list[schemas.NoteRead])
def list_notes(application_id: int, db: Session = Depends(get_db)):
    get_application_or_404(db, application_id)
    return db.scalars(
        select(models.Note)
        .where(models.Note.application_id == application_id)
        .order_by(models.Note.created_at.desc())
    ).all()


@router.post(
    "/applications/{application_id}/notes",
    response_model=schemas.NoteRead,
    status_code=201,
)
def create_note(
    application_id: int, payload: schemas.NoteCreate, db: Session = Depends(get_db)
):
    get_application_or_404(db, application_id)
    note = models.Note(application_id=application_id, **payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/notes/{note_id}", response_model=schemas.NoteRead)
def update_note(note_id: int, payload: schemas.NoteUpdate, db: Session = Depends(get_db)):
    note = get_note_or_404(db, note_id)
    note.body = payload.body
    db.commit()
    db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    db.delete(get_note_or_404(db, note_id))
    db.commit()
