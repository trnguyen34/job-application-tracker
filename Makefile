VENV := backend/.venv
PY := $(VENV)/bin/python

.PHONY: setup dev seed test test-backend test-frontend build serve

setup: $(VENV) frontend/node_modules

$(VENV): backend/requirements.txt
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install -r backend/requirements.txt
	touch $(VENV)

frontend/node_modules: frontend/package.json
	npm --prefix frontend install
	touch frontend/node_modules

dev: setup
	./run.sh

seed: setup
	cd backend && .venv/bin/python seed.py $(ARGS)

test: test-backend test-frontend

test-backend: setup
	cd backend && .venv/bin/python -m pytest tests -q

test-frontend: setup
	npm --prefix frontend run test -- --run

build: setup
	npm --prefix frontend run build

# Single-process mode: serve the built frontend from FastAPI on :8000
serve: build
	$(PY) -m uvicorn app.main:app --app-dir backend --port 8000
