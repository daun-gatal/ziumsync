from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ziumsync.api.deps import get_db
from ziumsync.core.utils import deep_merge
from ziumsync.models.domain import Pipeline, PipelineStatus, PipelineTableFilter
from ziumsync.schemas.domain import PipelineTableFilterCreate, PipelineUpdate
from ziumsync.services.compiler import PipelineCompilerService

router = APIRouter()


@router.post("/", response_model=Pipeline, summary="Create Pipeline", description="Creates a new CDC pipeline linking a Source and Target connection.")
def create_pipeline(pipeline: Pipeline, db: Session = Depends(get_db)):
    if isinstance(pipeline.workspace_id, str):
        pipeline.workspace_id = UUID(pipeline.workspace_id)
    if isinstance(pipeline.source_connection_id, str):
        pipeline.source_connection_id = UUID(pipeline.source_connection_id)
    if isinstance(pipeline.target_connection_id, str):
        pipeline.target_connection_id = UUID(pipeline.target_connection_id)
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.get("/", response_model=List[Pipeline], summary="List Pipelines", description="Returns a paginated list of all active CDC pipelines. Excludes soft-deleted pipelines.")
def read_pipelines(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    pipelines = db.exec(select(Pipeline).where(Pipeline.deleted_at == None).offset(skip).limit(limit)).all()
    return pipelines


@router.delete("/{pipeline_id}", summary="Delete Pipeline", description="Soft-deletes a pipeline. Will be blocked with 409 Conflict if the pipeline is currently RUNNING.")
def delete_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline or pipeline.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    if pipeline.status == PipelineStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Cannot delete a RUNNING pipeline. Stop it first.")

    pipeline.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Pipeline successfully deleted"}


@router.get("/{pipeline_id}", response_model=Pipeline, summary="Get Pipeline details", description="Returns the current status, configuration, and mapped connections of a pipeline.")
def get_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@router.get("/{pipeline_id}/compile", summary="Compile Pipeline Config", description="Compiles the deeply nested pipeline JSON configuration into a flat Debezium application.properties string representation.")
def compile_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    properties = PipelineCompilerService.compile(pipeline)
    return {"properties": properties}


@router.post("/{pipeline_id}/deploy", summary="Deploy Pipeline to Docker", description="Queues a background Celery task to compile the pipeline configuration and spin up a dedicated Debezium Docker container.")
def deploy_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    from ziumsync.worker.tasks import deploy_pipeline_task

    deploy_pipeline_task.delay(pipeline.id)

    return {"message": "Deployment task queued", "pipeline_id": pipeline.id}


@router.patch("/{pipeline_id}", response_model=Pipeline, summary="Update Pipeline", description="Updates pipeline configuration. Nested JSON fields (like advanced_properties) will be deeply merged instead of overwritten. Blocked if the pipeline is currently RUNNING.")
def update_pipeline(pipeline_id: UUID, pipeline_update: PipelineUpdate, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    if pipeline.status == PipelineStatus.RUNNING and pipeline_update.status != PipelineStatus.STOPPED:
        raise HTTPException(status_code=409, detail="Cannot modify a running pipeline. Stop it first.")

    update_data = pipeline_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "advanced_properties" and value is not None:
            pipeline.advanced_properties = deep_merge(pipeline.advanced_properties or {}, value)
        else:
            setattr(pipeline, key, value)

    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.put("/{pipeline_id}/filters", response_model=List[PipelineTableFilter], summary="Update Table Filters", description="Replaces all existing table filters (inclusion/exclusion rules) for a specific pipeline.")
def update_pipeline_filters(pipeline_id: UUID, filters: List[PipelineTableFilterCreate], db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    if pipeline.status == PipelineStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Cannot modify filters of a running pipeline. Stop it first.")

    for f in pipeline.table_filters:
        db.delete(f)

    new_filters = []
    for filter_item in filters:
        new_f = PipelineTableFilter(**filter_item.model_dump(), pipeline_id=pipeline_id)
        db.add(new_f)
        new_filters.append(new_f)

    db.commit()
    return new_filters
