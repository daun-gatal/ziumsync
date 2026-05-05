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
    def remove_pipeline(self, deployment_id: str) -> None:
        """Removes a pipeline and its resources."""
        pass

    @abc.abstractmethod
    def get_status(self, deployment_id: str) -> str:
        """Gets the status of the pipeline."""
        pass

    @abc.abstractmethod
    def get_logs(self, deployment_id: str, tail: int = 100) -> str:
        """Gets the logs of the pipeline."""
        pass

    @abc.abstractmethod
    def stream_logs(self, deployment_id: str, tail: int = 100):
        """Streams the logs of the pipeline."""
        pass


class DockerWorkerProvider(WorkerProvider):
    def __init__(self) -> None:
        docker_host = os.environ.get("DOCKER_HOST")
        if docker_host:
            self.client = docker.DockerClient(base_url=docker_host)
            self.client.ping()
            return

        try:
            self.client = docker.from_env()
            # Test connection
            self.client.ping()
        except Exception:
            raise docker.errors.DockerException(
                "Could not connect to Docker. Please set the DOCKER_HOST environment variable."
            )

    def _get_pipeline_dir(self, pipeline_id: UUID) -> str:
        """Returns the base directory for a pipeline's persistent data."""
        data_root = os.environ.get("ZIUMSYNC_DATA_DIR")
        if not data_root:
            # Default to local runtime directory for development
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_root = os.path.join(base_dir, "runtime")
        
        return os.path.join(data_root, "pipelines", str(pipeline_id))

    def deploy_pipeline(self, pipeline_id: UUID, config_properties: str) -> str:
        # 1. Prepare directories
        pipeline_dir = self._get_pipeline_dir(pipeline_id)
        conf_dir = os.path.join(pipeline_dir, "conf")
        data_dir = os.path.join(pipeline_dir, "data")
        
        os.makedirs(conf_dir, exist_ok=True)
        os.makedirs(data_dir, exist_ok=True)

        # Write config
        with open(os.path.join(conf_dir, "application.properties"), "w") as f:
            f.write(config_properties)

        # 2. Clean up existing container if any
        container_name = f"ziumsync-pipeline-{pipeline_id}"
        try:
            existing = self.client.containers.get(container_name)
            existing.remove(force=True)
        except docker.errors.NotFound:
            pass

        # 3. Run the Docker container
        container = self.client.containers.run(
            "quay.io/debezium/server:latest",
            volumes={
                conf_dir: {"bind": "/debezium/config", "mode": "ro"},
                data_dir: {"bind": "/debezium/data", "mode": "rw"}
            },
            environment={
                "QUARKUS_CONFIG_LOCATIONS": "/debezium/config/application.properties",
                "QUARKUS_LOG_CONSOLE_JSON": "false",
                # Persistence settings for offsets and schema history
                "DEBEZIUM_SOURCE_OFFSET_STORAGE_FILE_FILENAME": "/debezium/data/offsets.dat",
                "DEBEZIUM_SOURCE_SCHEMA_HISTORY_INTERNAL_FILE_FILENAME": "/debezium/data/history.dat"
            },
            detach=True,
            name=container_name,
            restart_policy={"Name": "on-failure", "MaximumRetryCount": 3},
        )
        return str(container.id)

    def stop_pipeline(self, deployment_id: str) -> None:
        try:
            container = self.client.containers.get(deployment_id)
            container.stop()
            # We do NOT remove here to preserve logs for post-mortem debugging.
            # Cleanup happens automatically during the next deploy_pipeline call.
        except docker.errors.NotFound:
            pass

    def remove_pipeline(self, deployment_id: str) -> None:
        """Forcefully stops and removes the container."""
        try:
            container = self.client.containers.get(deployment_id)
            container.remove(force=True)
        except docker.errors.NotFound:
            pass

    def remove_config(self, pipeline_id: UUID) -> None:
        """Removes the configuration directory for a pipeline."""
        import shutil
        pipeline_dir = self._get_pipeline_dir(pipeline_id)
        if os.path.exists(pipeline_dir):
            shutil.rmtree(pipeline_dir)

    def get_status(self, deployment_id: str) -> str:
        try:
            container = self.client.containers.get(deployment_id)
            return str(container.status)
        except docker.errors.NotFound:
            return "NOT_FOUND"

    def get_logs(self, deployment_id: str, tail: int = 100) -> str:
        try:
            container = self.client.containers.get(deployment_id)
            logs = container.logs(tail=tail, stdout=True, stderr=True)
            return logs.decode("utf-8")
        except docker.errors.NotFound:
            return "Container not found."

    def stream_logs(self, deployment_id: str, tail: int = 100):
        try:
            container = self.client.containers.get(deployment_id)
            return container.logs(stream=True, stdout=True, stderr=True, tail=tail)
        except docker.errors.NotFound:
            return None
