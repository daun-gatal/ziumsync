# ZiumSync Backend

This is the backend for ZiumSync, managed by `uv`.

## Setup

1. Run `uv sync` to install dependencies.
2. Run `source .venv/bin/activate` to activate the virtual environment.
3. Run `alembic upgrade head` to apply database migrations.
4. Run `uvicorn ziumsync.main:app --reload` to start the server.
