from fastapi import FastAPI

from .api.v1.api import api_router

app = FastAPI(title="ZiumSync API", description="API for managing CDC pipelines with Debezium Server", version="1.0.0")


@app.on_event("startup")
def on_startup():
    # Production Grade: Migrations are handled externally via docker-compose init containers or CI/CD pipelines
    # We do NOT run migrations programmatically here to avoid race conditions across multiple replica pods.
    pass


app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok"}
