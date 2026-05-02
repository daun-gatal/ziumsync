from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ziumsync.api.deps import get_db
from ziumsync.core.utils import deep_merge
from ziumsync.models.domain import PipelineStatus, SourceConnection, TargetConnection
from ziumsync.schemas.domain import SourceConnectionUpdate, TargetConnectionUpdate

router = APIRouter()


@router.post("/source", response_model=SourceConnection, summary="Create Source Connection", description="Creates a new database connection map for a CDC Source (e.g. PostgreSQL, MySQL).")
def create_source_connection(connection: SourceConnection, db: Session = Depends(get_db)):
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


@router.get("/source", response_model=List[SourceConnection], summary="List Source Connections", description="Returns a paginated list of all active Source database connections.")
def read_source_connections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.exec(select(SourceConnection).offset(skip).limit(limit)).all()


@router.post("/target", response_model=TargetConnection, summary="Create Target Connection", description="Creates a new message broker or data warehouse connection for a CDC Target (e.g. Kafka, Redis).")
def create_target_connection(connection: TargetConnection, db: Session = Depends(get_db)):
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


@router.get("/target", response_model=List[TargetConnection], summary="List Target Connections", description="Returns a paginated list of all active Target connections.")
def read_target_connections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.exec(select(TargetConnection).offset(skip).limit(limit)).all()


@router.patch("/source/{connection_id}", response_model=SourceConnection, summary="Update Source Connection", description="Updates source connection properties using a deep-merge strategy. Blocked if the connection is mapped to a RUNNING pipeline.")
def update_source_connection(connection_id: UUID, update_data: SourceConnectionUpdate, db: Session = Depends(get_db)):
    connection = db.get(SourceConnection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    for pipeline in connection.pipelines:
        if pipeline.status == PipelineStatus.RUNNING:
            raise HTTPException(status_code=409, detail=f"Cannot update connection. Pipeline {pipeline.id} is RUNNING.")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if key == "engine_config" and value is not None:
            connection.engine_config = deep_merge(connection.engine_config or {}, value)
        else:
            setattr(connection, key, value)

    db.commit()
    db.refresh(connection)
    return connection


@router.patch("/target/{connection_id}", response_model=TargetConnection, summary="Update Target Connection", description="Updates target connection properties using a deep-merge strategy. Blocked if the connection is mapped to a RUNNING pipeline.")
def update_target_connection(connection_id: UUID, update_data: TargetConnectionUpdate, db: Session = Depends(get_db)):
    connection = db.get(TargetConnection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    for pipeline in connection.pipelines:
        if pipeline.status == PipelineStatus.RUNNING:
            raise HTTPException(status_code=409, detail=f"Cannot update connection. Pipeline {pipeline.id} is RUNNING.")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if key == "engine_config" and value is not None:
            connection.engine_config = deep_merge(connection.engine_config or {}, value)
        else:
            setattr(connection, key, value)

    db.commit()
    db.refresh(connection)
    return connection


@router.delete("/source/{connection_id}", summary="Delete Source Connection", description="Hard-deletes a Source connection. Will be blocked with 409 Conflict if the connection is currently mapped to ANY existing pipeline to preserve referential integrity.")
def delete_source_connection(connection_id: UUID, db: Session = Depends(get_db)):
    connection = db.get(SourceConnection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if connection.pipelines:
        raise HTTPException(status_code=409, detail="Cannot delete connection. It is used by existing pipelines.")

    db.delete(connection)
    db.commit()
    return {"message": "Source connection successfully deleted"}


@router.delete("/target/{connection_id}", summary="Delete Target Connection", description="Hard-deletes a Target connection. Will be blocked with 409 Conflict if the connection is currently mapped to ANY existing pipeline to preserve referential integrity.")
def delete_target_connection(connection_id: UUID, db: Session = Depends(get_db)):
    connection = db.get(TargetConnection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if connection.pipelines:
        raise HTTPException(status_code=409, detail="Cannot delete connection. It is used by existing pipelines.")

    db.delete(connection)
    db.commit()
    return {"message": "Target connection successfully deleted"}
