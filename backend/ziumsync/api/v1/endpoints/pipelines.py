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
from ziumsync.worker.tasks import worker_provider
from ziumsync.worker.celery_app import celery_app  # noqa: F401
from fastapi.responses import StreamingResponse

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

    # Cleanup container if it exists
    if pipeline.current_deployment_id:
        worker_provider.remove_pipeline(pipeline.current_deployment_id)
    
    # Cleanup local config files
    worker_provider.remove_config(pipeline.id)

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


@router.post("/{pipeline_id}/deploy", summary="Start/Deploy Pipeline", description="Queues a background Celery task to compile the pipeline configuration and spin up a dedicated Debezium Docker container.")
def deploy_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    celery_app.send_task("ziumsync.worker.tasks.deploy_pipeline_task", args=[pipeline.id])

    return {"message": "Deployment task queued", "pipeline_id": pipeline.id}


@router.post("/{pipeline_id}/stop", summary="Stop Pipeline", description="Queues a background task to stop the pipeline container while preserving logs for debugging.")
def stop_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    celery_app.send_task("ziumsync.worker.tasks.stop_pipeline_task", args=[pipeline.id])
    return {"message": "Stop task queued", "pipeline_id": pipeline.id}


@router.post("/{pipeline_id}/restart", summary="Restart Pipeline", description="Queues a background task to stop then restart the pipeline container.")
def restart_pipeline(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    celery_app.send_task("ziumsync.worker.tasks.restart_pipeline_task", args=[pipeline.id])
    return {"message": "Restart task queued", "pipeline_id": pipeline.id}


@router.get("/{pipeline_id}/live_status", summary="Get Pipeline Live Status", description="Fetches the live status of the deployment container. Self-heals the DB status if the container crashed.")
def get_pipeline_live_status(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    if not pipeline.current_deployment_id:
        return {"status": pipeline.status, "container_status": "NONE"}

    container_status = worker_provider.get_status(pipeline.current_deployment_id)

    # Self-healing: if DB says it's running but it's exited/not found, mark as failed
    if pipeline.status == PipelineStatus.RUNNING and container_status in ("exited", "dead", "NOT_FOUND"):
        pipeline.status = PipelineStatus.FAILED
        db.commit()

    return {"status": pipeline.status, "container_status": container_status}


@router.get("/{pipeline_id}/logs", summary="Get Pipeline Logs", description="Fetches the live logs of the deployment container.")
def get_pipeline_logs(pipeline_id: UUID, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    if not pipeline.current_deployment_id:
        return {"logs": "No active deployment."}

    logs = worker_provider.get_logs(pipeline.current_deployment_id)
    return {"logs": logs}


@router.get("/{pipeline_id}/logs/stream", summary="Stream Pipeline Logs", description="Streams live logs from the container using Server-Sent Events (SSE) or simple streaming response.")
def stream_pipeline_logs(pipeline_id: UUID, tail: int = 100, db: Session = Depends(get_db)):
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    if not pipeline.current_deployment_id:
        raise HTTPException(status_code=400, detail="Pipeline is not running")

    def log_generator():
        log_stream = worker_provider.stream_logs(pipeline.current_deployment_id, tail=tail)
        if log_stream is None:
            yield "Container not found.\n"
            return
        for line in log_stream:
            yield line.decode("utf-8")

    return StreamingResponse(log_generator(), media_type="text/event-stream")


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
