"""CSV export/import for applications.

Export writes one row per application. Import maps flexible headers
(case-insensitive, common aliases) onto application fields, skipping bad
rows with a per-row reason instead of failing the whole file.
"""

import csv
import io

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas

EXPORT_COLUMNS = [
    "company",
    "role",
    "status",
    "applied_date",
    "job_url",
    "location",
    "work_mode",
    "salary_min",
    "salary_max",
    "salary_currency",
    "source",
    "priority",
]

# normalized header -> field name
HEADER_ALIASES = {
    "company": "company",
    "company name": "company",
    "employer": "company",
    "role": "role",
    "title": "role",
    "job title": "role",
    "position": "role",
    "status": "status",
    "stage": "status",
    "applied date": "applied_date",
    "applied": "applied_date",
    "date applied": "applied_date",
    "applied_date": "applied_date",
    "job url": "job_url",
    "job_url": "job_url",
    "url": "job_url",
    "link": "job_url",
    "posting url": "job_url",
    "location": "location",
    "city": "location",
    "work mode": "work_mode",
    "work_mode": "work_mode",
    "remote": "work_mode",
    "salary min": "salary_min",
    "salary_min": "salary_min",
    "min salary": "salary_min",
    "salary max": "salary_max",
    "salary_max": "salary_max",
    "max salary": "salary_max",
    "currency": "salary_currency",
    "salary_currency": "salary_currency",
    "salary currency": "salary_currency",
    "source": "source",
    "found via": "source",
    "priority": "priority",
}

VALID_STATUSES = set(models.STATUSES)


def export_csv(db: Session) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(EXPORT_COLUMNS)
    for application in db.scalars(
        select(models.Application).order_by(models.Application.id)
    ):
        writer.writerow([getattr(application, column) or "" for column in EXPORT_COLUMNS])
    return buffer.getvalue()


def _map_headers(fieldnames: list[str]) -> dict[str, str]:
    """Maps original CSV header -> application field for recognized headers."""
    mapping = {}
    for header in fieldnames:
        field = HEADER_ALIASES.get(header.strip().lower())
        if field:
            mapping[header] = field
    return mapping


def import_csv(db: Session, text: str) -> dict:
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return {"imported": 0, "skipped": [{"row": 0, "reason": "Empty file"}]}

    header_map = _map_headers(list(reader.fieldnames))
    if "company" not in header_map.values() or "role" not in header_map.values():
        return {
            "imported": 0,
            "skipped": [
                {"row": 0, "reason": "Missing required columns: company and role/title"}
            ],
        }

    imported = 0
    skipped: list[dict] = []
    warnings: list[dict] = []
    for line_number, row in enumerate(reader, start=2):  # 1-based incl. header
        raw = {field: (row.get(header) or "").strip() for header, field in header_map.items()}

        status = raw.get("status", "").lower().replace(" ", "_")
        if status and status not in VALID_STATUSES:
            warnings.append(
                {"row": line_number, "reason": f"Unknown status '{raw['status']}' -> wishlist"}
            )
            status = "wishlist"

        payload = {
            "company": raw.get("company", ""),
            "role": raw.get("role", ""),
            "status": status or "wishlist",
            "applied_date": raw.get("applied_date") or None,
            "job_url": raw.get("job_url") or None,
            "location": raw.get("location") or None,
            "work_mode": (raw.get("work_mode") or "").lower() or None,
            "salary_min": raw.get("salary_min") or None,
            "salary_max": raw.get("salary_max") or None,
            "salary_currency": raw.get("salary_currency") or "USD",
            "source": raw.get("source") or None,
            "priority": (raw.get("priority") or "medium").lower(),
        }
        try:
            validated = schemas.ApplicationCreate.model_validate(payload)
        except ValidationError as exc:
            first = exc.errors()[0]
            field = ".".join(str(part) for part in first["loc"]) or "row"
            skipped.append({"row": line_number, "reason": f"{field}: {first['msg']}"})
            continue

        db.add(models.Application(**validated.model_dump()))
        imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "warnings": warnings}
