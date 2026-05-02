from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ziumsync.api.deps import get_db
from ziumsync.core.utils import deep_merge
from ziumsync.models.domain import PipelineStatus, SourceConnection, TargetConnection
from ziumsync.schemas.domain import SourceConnectionUpdate, TargetConnectionUpdate

router = APIRouter()


@router.post("/source", response_model=SourceConnection)
def create_source_connection(connection: SourceConnection, db: Session = Depends(get_db)):
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


@router.get("/source", response_model=List[SourceConnection])
def read_source_connections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.exec(select(SourceConnection).offset(skip).limit(limit)).all()


@router.post("/target", response_model=TargetConnection)
def create_target_connection(connection: TargetConnection, db: Session = Depends(get_db)):
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


@router.get("/target", response_model=List[TargetConnection])
def read_target_connections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.exec(select(TargetConnection).offset(skip).limit(limit)).all()


@router.patch("/source/{connection_id}", response_model=SourceConnection)
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


@router.patch("/target/{connection_id}", response_model=TargetConnection)
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


@router.delete("/source/{connection_id}")
def delete_source_connection(connection_id: UUID, db: Session = Depends(get_db)):
    connection = db.get(SourceConnection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if connection.pipelines:
        raise HTTPException(status_code=409, detail="Cannot delete connection. It is used by existing pipelines.")

    db.delete(connection)
    db.commit()
    return {"message": "Source connection successfully deleted"}


@router.delete("/target/{connection_id}")
def delete_target_connection(connection_id: UUID, db: Session = Depends(get_db)):
    connection = db.get(TargetConnection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if connection.pipelines:
        raise HTTPException(status_code=409, detail="Cannot delete connection. It is used by existing pipelines.")

    db.delete(connection)
    db.commit()
    return {"message": "Target connection successfully deleted"}
