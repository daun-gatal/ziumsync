from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session

from ziumsync.models.domain import (
    AuthType,
    Credential,
    Pipeline,
    PipelineStatus,
    SourceConnection,
    SourceEngine,
    TargetConnection,
    TargetEngine,
    Workspace,
)


def test_pipeline_soft_delete_lock(client: TestClient, session: Session):
    # Setup mock data
    ws = Workspace(id=uuid4(), name="ws")
    cred = Credential(id=uuid4(), workspace_id=ws.id, name="cred", auth_type=AuthType.BASIC)
    src = SourceConnection(
        id=uuid4(),
        workspace_id=ws.id,
        credential_id=cred.id,
        name="src",
        engine=SourceEngine.POSTGRESQL,
        host="h",
        port=1,
        database_name="db",
    )
    tgt = TargetConnection(id=uuid4(), workspace_id=ws.id, credential_id=cred.id, name="tgt", engine=TargetEngine.KAFKA)

    pipe = Pipeline(
        id=uuid4(),
        workspace_id=ws.id,
        source_connection_id=src.id,
        target_connection_id=tgt.id,
        name="running_pipe",
        status=PipelineStatus.RUNNING,
    )

    session.add(ws)
    session.add(cred)
    session.add(src)
    session.add(tgt)
    session.add(pipe)
    session.commit()

    # Attempt to soft delete while RUNNING
    response = client.delete(f"/api/v1/pipelines/{pipe.id}")
    assert response.status_code == 409
    assert "RUNNING" in response.json()["detail"]

    # Stop it and delete again
    pipe.status = PipelineStatus.STOPPED
    session.add(pipe)
    session.commit()

    response2 = client.delete(f"/api/v1/pipelines/{pipe.id}")
    assert response2.status_code == 200

    # Verify it doesn't show in GET list
    response3 = client.get("/api/v1/pipelines/")
    assert len(response3.json()) == 0
