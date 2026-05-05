import traceback
from typing import Any
from uuid import UUID

from celery import shared_task
from sqlmodel import Session

from ziumsync.db.session import engine
from ziumsync.models.domain import Pipeline, PipelineStatus
from ziumsync.services.compiler import PipelineCompilerService
from ziumsync.worker.providers import DockerWorkerProvider

worker_provider = DockerWorkerProvider()


@shared_task(bind=True)
def deploy_pipeline_task(self: Any, pipeline_id: UUID) -> str:
    with Session(engine) as db:
        pipeline = db.get(Pipeline, pipeline_id)
        if not pipeline:
            return f"Pipeline {pipeline_id} not found."

        try:
            pipeline.status = PipelineStatus.DEPLOYING
            db.commit()

            # Compile properties
            properties_str = PipelineCompilerService.compile(pipeline)

            # Deploy using Docker
            container_id = worker_provider.deploy_pipeline(pipeline_id, properties_str)

            # Update Pipeline
            pipeline.current_deployment_id = container_id
            pipeline.status = PipelineStatus.RUNNING
            db.commit()

            return f"Deployed successfully. Container ID: {container_id}"

        except Exception as e:
            pipeline.status = PipelineStatus.FAILED
            db.commit()
            return f"Deployment failed: {str(e)}\n{traceback.format_exc()}"


@shared_task
def stop_pipeline_task(pipeline_id: UUID) -> str:
    with Session(engine) as db:
        pipeline = db.get(Pipeline, pipeline_id)
        if not pipeline:
            return f"Pipeline {pipeline_id} not found."

        if not pipeline.current_deployment_id:
            pipeline.status = PipelineStatus.STOPPED
            db.commit()
            return "Pipeline already stopped (no deployment ID)."

        try:
            pipeline.status = PipelineStatus.STOPPING
            db.commit()

            worker_provider.stop_pipeline(pipeline.current_deployment_id)
            pipeline.status = PipelineStatus.STOPPED
            db.commit()
            return "Stopped successfully."
        except Exception as e:
            pipeline.status = PipelineStatus.FAILED
            db.commit()
            return f"Failed to stop: {str(e)}"


@shared_task
def restart_pipeline_task(pipeline_id: UUID) -> str:
    # Synchronous call of tasks for simplicity in this flow,
    # or we could chain them.
    stop_res = stop_pipeline_task(pipeline_id)
    if "Failed" in stop_res:
        return f"Restart aborted: {stop_res}"

    return deploy_pipeline_task(pipeline_id)
