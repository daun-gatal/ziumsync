from fastapi import APIRouter

from .endpoints import connections, credentials, pipelines, workspaces

api_router = APIRouter()
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])
api_router.include_router(credentials.router, prefix="/credentials", tags=["Credentials"])
api_router.include_router(connections.router, prefix="/connections", tags=["Connections"])
api_router.include_router(pipelines.router, prefix="/pipelines", tags=["Pipelines"])
