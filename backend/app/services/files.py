"""Attachment file storage on the local filesystem.

Files live under UPLOADS_DIR/{application_id}/{uuid4hex}{ext} — server-generated
names only, so client filenames can never traverse paths.
"""

import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .. import config, models

CHUNK_SIZE = 1024 * 1024


def save_upload(application_id: int, upload: UploadFile) -> tuple[str, int]:
    """Validate and persist an upload; returns (stored_name, size_bytes)."""
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in config.ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type {extension or '(none)'}; "
            f"allowed: {', '.join(sorted(config.ALLOWED_UPLOAD_EXTENSIONS))}",
        )

    stored_name = f"{application_id}/{uuid.uuid4().hex}{extension}"
    destination = config.UPLOADS_DIR / stored_name
    destination.parent.mkdir(parents=True, exist_ok=True)

    size = 0
    try:
        with destination.open("wb") as out:
            while chunk := upload.file.read(CHUNK_SIZE):
                size += len(chunk)
                if size > config.MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds {config.MAX_UPLOAD_BYTES} byte limit",
                    )
                out.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    return stored_name, size


def file_path(attachment: models.Attachment) -> Path:
    return config.UPLOADS_DIR / attachment.stored_name


def delete_file(attachment: models.Attachment) -> None:
    file_path(attachment).unlink(missing_ok=True)


def delete_application_files(application: models.Application) -> None:
    for attachment in application.attachments:
        delete_file(attachment)
    shutil.rmtree(config.UPLOADS_DIR / str(application.id), ignore_errors=True)
