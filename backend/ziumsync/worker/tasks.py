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
