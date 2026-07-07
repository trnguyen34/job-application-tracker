from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .applications import get_application_or_404

router = APIRouter(prefix="/api", tags=["contacts"])


def get_contact_or_404(db: Session, contact_id: int) -> models.Contact:
    contact = db.get(models.Contact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.get(
    "/applications/{application_id}/contacts", response_model=list[schemas.ContactRead]
)
def list_contacts(application_id: int, db: Session = Depends(get_db)):
    get_application_or_404(db, application_id)
    return db.scalars(
        select(models.Contact)
        .where(models.Contact.application_id == application_id)
        .order_by(models.Contact.created_at)
    ).all()


@router.post(
    "/applications/{application_id}/contacts",
    response_model=schemas.ContactRead,
    status_code=201,
)
def create_contact(
    application_id: int, payload: schemas.ContactCreate, db: Session = Depends(get_db)
):
    get_application_or_404(db, application_id)
    contact = models.Contact(application_id=application_id, **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.patch("/contacts/{contact_id}", response_model=schemas.ContactRead)
def update_contact(
    contact_id: int, payload: schemas.ContactUpdate, db: Session = Depends(get_db)
):
    contact = get_contact_or_404(db, contact_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    db.delete(get_contact_or_404(db, contact_id))
    db.commit()
