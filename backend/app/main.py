from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import models  # noqa: F401 — registers tables on Base.metadata
from .database import Base, engine
from .routers import (
    applications,
    attachments,
    contacts,
    csv_io,
    interviews,
    notes,
    reminders,
    stats,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is auto-created rather than migrated: single-user local SQLite
    # with no deployed data. Alembic can be baselined later if needed.
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Job Application Tracker", docs_url="/docs", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(applications.router)
app.include_router(contacts.router)
app.include_router(interviews.router)
app.include_router(notes.router)
app.include_router(reminders.router)
app.include_router(stats.router)
app.include_router(attachments.router)
app.include_router(csv_io.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


class SpaStaticFiles(StaticFiles):
    """Serve the built frontend, falling back to index.html so client-side
    routes like /applications/3 work on hard refresh."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


# Mounted last so every /api route wins; only active once `make build` has
# produced frontend/dist (dev mode uses the Vite server instead).
_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _dist.is_dir():
    app.mount("/", SpaStaticFiles(directory=_dist, html=True), name="spa")
