from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session

from ziumsync.models.domain import (
    AuthType,
    Credential,
    Pipeline,
    SourceConnection,
    SourceEngine,
    TargetConnection,
    TargetEngine,
    Workspace,
)


def test_connection_hard_delete_lock(client: TestClient, session: Session):
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
        id=uuid4(), workspace_id=ws.id, source_connection_id=src.id, target_connection_id=tgt.id, name="pipe"
    )

    session.add(ws)
    session.add(cred)
    session.add(src)
    session.add(tgt)
    session.add(pipe)
    session.commit()

    # Attempt to delete source connection used by active pipeline
    response = client.delete(f"/api/v1/connections/source/{src.id}")
    assert response.status_code == 409
    assert "used by existing pipelines" in response.json()["detail"]

    # Soft delete the pipeline
    client.delete(f"/api/v1/pipelines/{pipe.id}")

    # Try deleting connection again
    response2 = client.delete(f"/api/v1/connections/source/{src.id}")
    assert response2.status_code == 409
    assert "used by existing pipelines" in response2.json()["detail"]
