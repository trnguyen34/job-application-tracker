from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import csv_io

router = APIRouter(prefix="/api", tags=["csv"])


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)):
    content = csv_io.export_csv(db)
    return Response(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="applications.csv"'},
    )


@router.post("/import/csv")
def import_csv(file: UploadFile, db: Session = Depends(get_db)) -> dict:
    try:
        text = file.file.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=415, detail="File must be UTF-8 encoded CSV")
    return csv_io.import_csv(db, text)
