from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.api import api_router

tags_metadata = [
    {
        "name": "Workspaces",
        "description": "Operations with workspaces. Workspaces act as logical groups for CDC pipelines.",
    },
    {
        "name": "Credentials",
        "description": "Manage encrypted credentials used for database authentication.",
    },
    {
        "name": "Connections",
        "description": "Manage Source and Target engine connections. Ensures referential integrity against active pipelines.",
    },
    {
        "name": "Pipelines",
        "description": "Orchestrate, compile, and deploy Debezium CDC pipelines.",
    },
]

app = FastAPI(
    title="ZiumSync API",
    description="A robust, production-grade CDC orchestration API seamlessly managing Debezium instances.",
    version="1.0.0",
    openapi_tags=tags_metadata,
    license_info={
        "name": "Apache 2.0",
        "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Production Grade: Migrations are handled externally via docker-compose init containers or CI/CD pipelines
    # We do NOT run migrations programmatically here to avoid race conditions across multiple replica pods.
    pass


app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok"}
