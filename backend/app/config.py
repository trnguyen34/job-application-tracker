"""Runtime configuration.

Paths default to the repository root (two levels up from this file) so the
database and uploads live next to run.sh. Everything is overridable via
environment variables, which is how tests point the app at temp locations.
"""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

DB_PATH = Path(os.environ.get("TRACKER_DB_PATH", REPO_ROOT / "tracker.db"))
UPLOADS_DIR = Path(os.environ.get("TRACKER_UPLOADS_DIR", REPO_ROOT / "uploads"))
MAX_UPLOAD_BYTES = int(os.environ.get("TRACKER_MAX_UPLOAD_BYTES", 10 * 1024 * 1024))

ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".docx", ".doc"}
