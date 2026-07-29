#!/usr/bin/env bash
# One-command dev runner: backend venv + deps, frontend deps, both servers.
set -euo pipefail
cd "$(dirname "$0")"

VENV=backend/.venv

# The backend needs Python 3.11+, but on plenty of machines plain
# `python3` is older. Probe versioned names first, newest to oldest.
find_python() {
  local candidate
  for candidate in python3.14 python3.13 python3.12 python3.11 python3 python; do
    if command -v "$candidate" >/dev/null 2>&1 &&
       "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

# A venv left behind by an older interpreter also needs rebuilding.
venv_ok() {
  [ -x "$VENV/bin/python" ] &&
  "$VENV/bin/python" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null
}

if ! venv_ok; then
  if ! PYTHON=$(find_python); then
    echo "Error: Python 3.11+ is required but was not found on PATH." >&2
    echo "Install it (e.g. 'brew install python@3.12' or from python.org) and rerun." >&2
    exit 1
  fi
  if [ -d "$VENV" ]; then
    echo "Rebuilding virtual environment (existing one is older than Python 3.11)…"
    rm -rf "$VENV"
  else
    echo "Creating Python virtual environment…"
  fi
  echo "Using $("$PYTHON" -V 2>&1) ($PYTHON)"
  "$PYTHON" -m venv "$VENV"
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
