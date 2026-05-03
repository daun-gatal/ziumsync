# ZiumSync

ZiumSync is a modern, production-grade Change Data Capture (CDC) orchestration platform. It is designed to abstract away the complexities of running and managing [Debezium](https://debezium.io/), allowing you to quickly synchronize data across databases and message brokers (e.g., PostgreSQL to Kafka).

## Architecture

The project is structured as a monorepo with two production-ready components:

1. **Backend** (`/backend`): A robust, dynamically orchestrated API built with Python, FastAPI, and SQLModel. It utilizes a state-aware architecture and tightly integrates with Docker to spawn Debezium Server instances on the fly.
2. **Frontend** (`/frontend`): A rich, glassmorphism-themed React dashboard built with Bun and Vite. Provides a full UI for managing Workspaces, Credentials, Connections, and CDC Pipelines.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- `uv` (Python dependency manager)
- `bun` (JavaScript runtime & package manager)
- Python 3.10+

### Backend Local Development
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   uv sync --frozen
   ```
3. Run the development server (defaults to in-memory SQLite):
   ```bash
   uv run uvicorn ziumsync.main:app --reload
   ```

### Frontend Local Development
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run the development server (available at `http://localhost:8080`):
   ```bash
   bun run dev
   ```

### Running Tests & Linting
ZiumSync enforces rigid typing and formatting via Ruff and Mypy on the backend, and strict TypeScript checking on the frontend.
```bash
# Backend
cd backend
uv run pytest
uv run ruff check .
uv run mypy ziumsync/ tests/

# Frontend
cd frontend
bun run tsc --noEmit
bun run build
```

### Production Deployment
ZiumSync is fully containerized. To spin up the full production stack (Frontend dashboard, Backend API, PostgreSQL, Redis, and Celery Workers):
```bash
docker-compose up -d
```

| Service       | URL                       |
|---------------|---------------------------|
| Frontend UI   | http://localhost:8080      |
| Backend API   | http://localhost:8000      |
| API Docs      | http://localhost:8000/docs |

## AI & Agent Contributions
If you are an AI coding assistant or agent contributing to this repository, you **MUST** read the relevant playbook before writing any code. These documents dictate strict requirements for patterns, templates, and standards.

- **Backend Playbook:** [docs/skills/backend/SKILL.md](docs/skills/backend/SKILL.md)
- **Frontend Playbook:** [docs/skills/frontend/SKILL.md](docs/skills/frontend/SKILL.md)
