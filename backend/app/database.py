from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from . import config


class Base(DeclarativeBase):
    pass


def _enable_foreign_keys(dbapi_connection, connection_record) -> None:
    # SQLite ignores foreign keys unless enabled per connection.
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def make_engine(url: str):
    engine = create_engine(url, connect_args={"check_same_thread": False})
    event.listen(engine, "connect", _enable_foreign_keys)
    return engine


engine = make_engine(f"sqlite:///{config.DB_PATH}")
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


# Columns added after a table first shipped, keyed by table. create_all only
# creates missing tables — for databases created before a column existed,
# ensure_columns() backfills it with ALTER TABLE (a migration-lite that keeps
# the no-Alembic stance workable for a single-user SQLite file).
_ADDED_COLUMNS: dict[str, dict[str, str]] = {
    "applications": {"stale_snoozed_until": "DATE"},
}


def ensure_columns(target_engine) -> None:
    with target_engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            existing = {
                row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")
            }
            if not existing:  # table doesn't exist yet; create_all handles it
                continue
            for name, ddl in columns.items():
                if name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
