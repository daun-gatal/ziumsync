# ZiumSync Backend Agent Playbook

**Target Audience:** AI Coding Assistants, Agents, and Backend Developers working on the ZiumSync Platform.

This document is the absolute source of truth for generating code in the ZiumSync orchestration backend. You **MUST** strictly adhere to the patterns, templates, and directory structures defined here.

## 0. The Self-Updating Mandate
Codebases evolve. If you (an AI Agent) are explicitly instructed by the USER to implement a new architectural pattern, add a new core dependency, or change the testing strategy, **you MUST update this SKILL.md document** to reflect the new standard before concluding your work. Always keep this playbook perfectly synced with the repository's state.

## 1. Directory Architecture
Always place code in its designated location:
```text
backend/ziumsync/
├── api/v1/endpoints/  # FastAPI Routers. Must be thin.
├── models/            # SQLModel Definitions (Database schema)
├── schemas/           # Pydantic validation schemas (API In/Out)
├── services/          # Heavy business logic (e.g., CompilerService)
└── worker/            # Celery Tasks and Docker interaction logic
```

## 2. Hard Guardrails (Ruff & Mypy)
We employ a **Two-Pronged Guardrail** strategy. The CI/CD pipeline runs:
- `uv run ruff check .` (Strict linting, PEP-8)
- `uv run mypy ziumsync/ tests/` (Strict Static Typing)

**Rules:**
- All new variables and function signatures **MUST** have accurate type hints.
- Use `from typing import Optional, List, Dict, Any`.
- Use `from uuid import UUID` for all primary keys.

## 3. Database Entity Template (SQLModel)
When creating a new database model, you must use `uuid4` Primary Keys and `datetime.now(timezone.utc)` for audit fields.

**Template:**
```python
from typing import Optional, Dict, Any
from uuid import UUID
import uuid
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

PortableJSON = JSON().with_variant(JSONB, "postgresql")

class ExampleModel(SQLModel, table=True):
    __tablename__ = "example_model"
    
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    
    # Flexible Metadata
    config: Dict[str, Any] = Field(default={}, sa_column=Column(PortableJSON))
    
    # Audit Trail (Use timezone.utc for 3.10 compatibility)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = Field(default=None)
```
*Note: After updating `domain.py`, you MUST generate a migration via `alembic revision --autogenerate -m "..."` and verify `sqlmodel` is imported in the generated `versions/*.py`.*

## 4. API Router Template (FastAPI)
Endpoints must use the `deep_merge` algorithm for `PATCH` requests and enforce State-Aware constraint locks for `DELETE`.
Furthermore, **ALL** endpoints must include `summary` and `description` arguments in the route decorator to ensure rich, production-grade OpenAPI (Swagger) documentation.

**Template:**
```python
from typing import List
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ziumsync.api.deps import get_db
from ziumsync.core.utils import deep_merge
from ziumsync.models.domain import Pipeline, PipelineStatus

router = APIRouter()

@router.delete(
    "/{pipeline_id}",
    summary="Delete Pipeline",
    description="Soft-deletes a pipeline. Blocked with 409 Conflict if currently RUNNING."
)
def delete_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)) -> dict[str, str]:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline or pipeline.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Pipeline not found")
        
    # State-Aware Lock: Prevent deletion of running pipelines
    if pipeline.status == PipelineStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Cannot delete RUNNING pipeline.")
        
    pipeline.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Successfully deleted"}
```

## 5. Unit Testing Workflow
- **Framework**: Pytest (`uv run pytest`)
- **Fixture**: Never mock PostgreSQL. Rely on the `sqlite:///:memory:` fixture in `conftest.py` with `StaticPool` for millisecond-fast test isolation.
- **Scope**: Focus unit tests purely on business logic (e.g., locking constraints, dictionary merging algorithms) rather than trivial HTTP boilerplate.

## 6. Security & Secret Management
- **Never Log Secrets**: Passwords, API keys, and Tokens must **never** be logged or returned in plain text via API `GET` responses.
- **Pydantic Validation**: All incoming requests must be strictly validated using Pydantic schemas. Never accept arbitrary dictionaries `Dict[str, Any]` for sensitive top-level payloads.

## 7. Observability & Logging
- **No Print Statements**: Absolutely **no** `print()` statements. Use standard python logging or structural JSON loggers.
- **Audit Trails**: State changes to critical infrastructure (`Pipelines`, `Connections`) must leave an identifiable trail utilizing `created_at` and `deleted_at`.

## 8. Error Handling Standards
- **Standardized Exceptions**: Use `fastapi.HTTPException` with precise HTTP status codes:
  - `400 Bad Request`: Validation failures or malformed data.
  - `404 Not Found`: Entity does not exist or was soft-deleted.
  - `409 Conflict`: State-aware constraint violations (e.g., trying to delete a running pipeline).
- **Graceful Degradation**: Catch infrastructure errors gracefully, returning clean, user-friendly JSON error details rather than raw stack traces.
