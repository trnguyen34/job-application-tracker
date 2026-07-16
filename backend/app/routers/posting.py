from fastapi import APIRouter

from .. import schemas
from ..services import posting

router = APIRouter(prefix="/api", tags=["posting"])


@router.post("/posting-preview", response_model=schemas.PostingPreview)
def posting_preview(payload: schemas.PostingPreviewRequest) -> schemas.PostingPreview:
    """Fetch a job posting and read what we can off it for the new-application
    form. Deliberately never errors: fields we couldn't establish come back
    None and the form simply stays as it was."""
    html = posting.fetch_html(payload.url)
    return schemas.PostingPreview(**posting.parse_posting(html, payload.url))
