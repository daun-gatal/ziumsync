import abc
import os
from uuid import UUID

import docker


class WorkerProvider(abc.ABC):
    @abc.abstractmethod
    def deploy_pipeline(self, pipeline_id: UUID, config_properties: str) -> str:
        """Deploys a Debezium server pipeline. Returns the deployment/container ID."""
        pass

    @abc.abstractmethod
    def stop_pipeline(self, deployment_id: str) -> None:
        """Stops an active pipeline."""
        pass

    @abc.abstractmethod
    def get_status(self, deployment_id: str) -> str:
        """Gets the status of the pipeline."""
        pass


class DockerWorkerProvider(WorkerProvider):
    def __init__(self) -> None:
        self.client = docker.from_env()

    def deploy_pipeline(self, pipeline_id: UUID, config_properties: str) -> str:
        # 1. Create a directory to hold the config
        config_dir = f"/tmp/ziumsync_pipelines/{pipeline_id}"
        os.makedirs(f"{config_dir}/conf", exist_ok=True)

        with open(f"{config_dir}/conf/application.properties", "w") as f:
            f.write(config_properties)

        # 2. Run the Docker container
        container = self.client.containers.run(
            "debezium/server:latest",
            volumes={f"{config_dir}/conf": {"bind": "/debezium/conf", "mode": "ro"}},
            detach=True,
            name=f"ziumsync-pipeline-{pipeline_id}",
        )
        return str(container.id)

    def stop_pipeline(self, deployment_id: str) -> None:
        try:
            container = self.client.containers.get(deployment_id)
            container.stop()
            container.remove()
        except docker.errors.NotFound:
            pass

    def get_status(self, deployment_id: str) -> str:
        try:
            container = self.client.containers.get(deployment_id)
            return str(container.status)
        except docker.errors.NotFound:
            return "NOT_FOUND"
