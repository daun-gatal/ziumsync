from uuid import uuid4

from ziumsync.models.domain import (
    AuthType,
    Credential,
    FormatType,
    Pipeline,
    SourceConnection,
    SourceEngine,
    TargetConnection,
    TargetEngine,
    Workspace,
)
from ziumsync.services.compiler import PipelineCompilerService


def test_compiler_service_flattening():
    # Setup dummy domain models
    workspace = Workspace(id=uuid4(), name="ws")
    cred = Credential(id=uuid4(), workspace_id=workspace.id, name="cred", auth_type=AuthType.BASIC)

    source = SourceConnection(
        id=uuid4(),
        workspace_id=workspace.id,
        credential_id=cred.id,
        name="src",
        engine=SourceEngine.POSTGRESQL,
        host="host",
        port=5432,
        database_name="db",
        engine_config={"plugin.name": "pgoutput", "slot.name": "my_slot"},
    )
    target = TargetConnection(
        id=uuid4(),
        workspace_id=workspace.id,
        credential_id=cred.id,
        name="tgt",
        engine=TargetEngine.KAFKA,
        engine_config={"bootstrap.servers": "broker:9092"},
    )

    pipeline = Pipeline(
        id=uuid4(),
        workspace_id=workspace.id,
        source_connection_id=source.id,
        target_connection_id=target.id,
        name="test_pipe",
        source_connection=source,
        target_connection=target,
        key_format=FormatType.JSON,
        value_format=FormatType.JSON,
        advanced_properties={"tasks.max": 1, "custom.setting": "value"},
    )

    properties = PipelineCompilerService.compile(pipeline)

    # Assert base properties
    assert "tasks.max=1" in properties
    assert "custom.setting=value" in properties

    # Assert source flattening with correct prefix
    assert "debezium.source.plugin.name=pgoutput" in properties
    assert "debezium.source.slot.name=my_slot" in properties

    # Assert target flattening with correct prefix
    assert "debezium.sink.kafka.bootstrap.servers=broker:9092" in properties
