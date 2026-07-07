from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401 — registers tables on Base.metadata
from .database import Base, engine
from .routers import applications


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


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
