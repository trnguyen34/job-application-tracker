import os
import tempfile

# Must be set before app modules import config, so the lifespan create_all
# and default engine never touch the real tracker.db or uploads/.
_tmp = tempfile.mkdtemp(prefix="tracker-tests-")
os.environ.setdefault("TRACKER_DB_PATH", os.path.join(_tmp, "test.db"))
os.environ.setdefault("TRACKER_UPLOADS_DIR", os.path.join(_tmp, "uploads"))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import config
from app import models  # noqa: F401 — registers tables on Base.metadata
from app.database import Base, get_db, _enable_foreign_keys
from app.main import app


@pytest.fixture()
def engine():
    # StaticPool shares the single in-memory connection across the
    # TestClient threadpool; without it each connection sees an empty DB.
    engine = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    event.listen(engine, "connect", _enable_foreign_keys)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(engine):
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = TestSession()
    yield session
    session.close()


@pytest.fixture()
def client(engine, tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    monkeypatch.setattr(config, "UPLOADS_DIR", uploads)

    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
