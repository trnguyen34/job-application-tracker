#!/usr/bin/env bash
# One-command dev runner: backend venv + deps, frontend deps, both servers.
set -euo pipefail
cd "$(dirname "$0")"

VENV=backend/.venv

if [ ! -d "$VENV" ]; then
  echo "Creating Python virtual environment…"
  python3 -m venv "$VENV"
fi

if ! "$VENV/bin/python" -c "import fastapi" 2>/dev/null; then
  echo "Installing backend dependencies…"
  "$VENV/bin/pip" install --quiet -r backend/requirements.txt
fi

if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies…"
  npm --prefix frontend install
fi

echo "Starting FastAPI on http://127.0.0.1:8000 (docs at /docs)"
"$VENV/bin/python" -m uvicorn app.main:app --app-dir backend --reload --port 8000 &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null' EXIT

echo "Starting Vite on http://127.0.0.1:5173"
npm --prefix frontend run dev
