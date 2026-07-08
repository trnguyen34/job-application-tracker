# Job Tracker

A single-user job application tracker that runs entirely on your machine.
Kanban pipeline with drag-and-drop (five active columns plus a grouped
Closed column), application details with contacts / interview rounds /
notes / reminders / file attachments, a stats dashboard with a GitHub-style
activity heatmap, light & dark themes, and CSV import/export via the API.
No accounts, no cloud — one SQLite file.

**Stack:** FastAPI + SQLAlchemy 2 + SQLite backend · React 19 + Vite +
TypeScript frontend · dnd-kit · pure-CSS charts.

The UI implements the "Job Tracker" design from the claude.ai/design
project `Job Application Tracker` (`Job Tracker.dc.html`); design tokens
live in `frontend/src/styles/tokens.css`.

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

## Using the app

*Screenshots use the bundled sample data (`make seed`).*

### The board

![Kanban board](docs/screenshots/board.png)

The board is home. Six columns cover the pipeline: **Wishlist → Applied →
Phone Screen → Interview → Offer**, plus a **Closed** column that groups
the four terminal outcomes (each closed card carries its own tag —
Rejected, Withdrawn, Ghosted, Accepted).

- **Drag a card** to another column to change its status. Dropping on
  *Closed* asks which outcome it reached. Moving a card out of Wishlist
  stamps today as its applied date (unless one is already set).
- Each card shows work mode · location · *“Applied Nd ago”* (or *“Saved
  Nd ago”* before you apply), a priority dot (terracotta = high, tan =
  medium), and the next thing coming up — an overdue reminder in red,
  otherwise the earliest upcoming reminder or scheduled interview.
- **Search** (top right) filters by company or role as you type.
- **☾ / ☀** toggles dark mode; the choice sticks across sessions.
- **Board / Dashboard** in the top-left switches views.

### The application modal

![Application modal](docs/screenshots/application-modal.png)

Click any card (or open `/applications/<id>` directly — links survive
refresh) and the application opens as a modal over the board. Esc, the
✕, the backdrop, or the browser back button closes it.

- The **status pill** opens a grouped Active/Closed menu; the **Low /
  Med / High** control sets priority. Changes reflect on the board
  behind the modal immediately.
- Tabs: **Contacts** (add, edit, delete), **Interview Rounds** (type,
  schedule, interviewers, outcome), **Notes** (composer + inline
  editing), and **Attachments** (PDF/Word up to 10 MB, multi-file
  upload, click a row to download).
- The **Details** sidebar card edits everything else in one save:
  applied date, location, work mode, salary range + currency, source,
  job posting URL. **Reminders** live below it — add with a due date,
  check off, or delete.
- **Delete** (top right) removes the application and everything in it,
  after a confirmation.

### Adding an application

![New application modal](docs/screenshots/new-application.png)

**+ New Application** opens the quick-add form. Company and role are
required; status defaults to **Applied** (stamping today as the applied
date — pick Wishlist to save without one). You can attach **contacts**
right away, and choosing *Phone Screen* or *Interview* status unlocks
adding **interview rounds** before the application even exists. Creating
drops you straight into the application modal.

### The dashboard

![Dashboard](docs/screenshots/dashboard.png)

Stats at a glance: totals, active pipeline, offers, rejections, and
average days to first interview. **Upcoming follow-ups** lists undone
reminders due in the next two weeks (overdue first — click a row to jump
to its application). Below: a GitHub-style **activity heatmap** of
applications per day over the last year, applications per week, the
pipeline funnel, and applications by source.

### Dark mode

![Kanban board in dark mode](docs/screenshots/board-dark.png)

## Development notes

- Backend code is in `backend/app/` (routers → services → models); tests in
  `backend/tests/` run against an in-memory SQLite and a temp uploads dir.
- Frontend code is in `frontend/src/`; component tests mock the API client.
- Everything works offline. CORS is open only to the Vite dev origin.
- Python deps are pinned in `backend/requirements.txt` and installed into
  `backend/.venv` — never globally.
