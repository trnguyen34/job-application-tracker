# trackrecord — job application tracker

A single-user job application tracker that runs entirely on your machine.
Kanban pipeline with drag-and-drop, application details with contacts /
interviews / notes / reminders / file attachments, a stats dashboard, and
CSV import/export. No accounts, no cloud — one SQLite file.

**Stack:** FastAPI + SQLAlchemy 2 + SQLite backend · React 19 + Vite +
TypeScript frontend · Recharts · dnd-kit.

## Quick start

```bash
./run.sh          # creates backend/.venv, installs deps, starts both servers
```

Then open http://localhost:5173. The API (with OpenAPI docs at
http://127.0.0.1:8000/docs) runs on port 8000; the Vite dev server proxies
`/api` to it.

Prefer make targets?

```bash
make setup        # venv + npm install
make dev          # same as ./run.sh
make seed         # load ~10 sample applications (ARGS=--force to wipe first)
make test         # backend (pytest) + frontend (vitest) suites
make serve        # single-process mode: build frontend, serve it from FastAPI on :8000
```

## Where your data lives

| What | Where |
|---|---|
| Database | `tracker.db` at the repo root (SQLite, one file) |
| Uploaded files | `uploads/<application id>/` |

Both are gitignored — they're personal data and never belong in the repo.
Back them up by copying the two paths.

The schema is created automatically on startup (`create_all`). There are no
migrations: this is a greenfield single-user app with a disposable local
database, so Alembic would add ceremony without benefit. If the schema
evolves later, introduce Alembic with a baseline autogenerate revision.

## Development notes

- Backend code is in `backend/app/` (routers → services → models); tests in
  `backend/tests/` run against an in-memory SQLite and a temp uploads dir.
- Frontend code is in `frontend/src/`; component tests mock the API client.
- Everything works offline. CORS is open only to the Vite dev origin.
- Python deps are pinned in `backend/requirements.txt` and installed into
  `backend/.venv` — never globally.
