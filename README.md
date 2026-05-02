# ZiumSync

ZiumSync is a modern, production-grade Change Data Capture (CDC) orchestration platform. It is designed to abstract away the complexities of running and managing [Debezium](https://debezium.io/), allowing you to quickly synchronize data across databases and message brokers (e.g., PostgreSQL to Kafka).

## Architecture

The project is divided into two main components:
1. **Backend**: A robust, dynamically orchestrated API built with Python, FastAPI, and SQLModel. It utilizes a state-aware architecture and tightly integrates with Docker to spawn Debezium Server instances on the fly.
2. **Frontend** *(Coming Soon)*: A rich, beautiful React dashboard built with Bun and modern CSS.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- `uv` (Python dependency manager)
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
3. Run the development server (Defaults to in-memory SQLite):
   ```bash
   uv run uvicorn ziumsync.main:app --reload
   ```

### Running Tests & Linting
ZiumSync enforces rigid typing and formatting via Ruff and Mypy.
```bash
cd backend
uv run pytest
uv run ruff check .
uv run mypy ziumsync/ tests/
```

### Production Deployment
ZiumSync is fully containerized. To spin up the production stack (PostgreSQL metadata database, Redis, Celery Workers + Backend API):
```bash
docker-compose up --build -d
```

## AI & Agent Contributions
If you are an AI coding assistant or agent contributing to this repository, you **MUST** read the [Backend Agent Playbook](docs/skills/backend/SKILL.md) before writing any code. It dictates strict requirements for dependency management (`uv`), schema definitions (`uuid4`), and testing.
