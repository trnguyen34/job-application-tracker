from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services import files
from .applications import get_application_or_404

router = APIRouter(prefix="/api", tags=["attachments"])


def get_attachment_or_404(db: Session, attachment_id: int) -> models.Attachment:
    attachment = db.get(models.Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return attachment


@router.post(
    "/applications/{application_id}/attachments",
    response_model=schemas.AttachmentRead,
    status_code=201,
)
def upload_attachment(
    application_id: int,
    file: UploadFile,
    file_type: schemas.FileType = Form("other"),
    db: Session = Depends(get_db),
):
    get_application_or_404(db, application_id)
    stored_name, size = files.save_upload(application_id, file)
    attachment = models.Attachment(
        application_id=application_id,
        filename=file.filename or stored_name.split("/")[-1],
        stored_name=stored_name,
        file_type=file_type,
        content_type=file.content_type,
        size_bytes=size,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/attachments/{attachment_id}/download")
def download_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = get_attachment_or_404(db, attachment_id)
    path = files.file_path(attachment)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File missing from disk")
    return FileResponse(
        path,
        filename=attachment.filename,
        media_type=attachment.content_type or "application/octet-stream",
    )


@router.delete("/attachments/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = get_attachment_or_404(db, attachment_id)
    files.delete_file(attachment)
    db.delete(attachment)
    db.commit()
