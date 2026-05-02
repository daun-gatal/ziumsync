from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ziumsync.api.deps import get_db
from ziumsync.models.domain import PipelineStatus, Workspace

router = APIRouter()


@router.post("/", response_model=Workspace)
def create_workspace(workspace: Workspace, db: Session = Depends(get_db)):
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.get("/", response_model=List[Workspace])
def read_workspaces(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    workspaces = db.exec(select(Workspace).where(Workspace.deleted_at == None).offset(skip).limit(limit)).all()
    return workspaces


@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: UUID, db: Session = Depends(get_db)):
    workspace = db.get(Workspace, workspace_id)
    if not workspace or workspace.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    now = datetime.now(timezone.utc)
    workspace.deleted_at = now

    # Soft delete associated pipelines
    for pipeline in workspace.pipelines:
        # Don't delete running pipelines? Actually, the plan says:
        # "Deleting a workspace soft-deletes all associated pipelines."
        # We might need to block it if any pipeline is running.
        if pipeline.status == PipelineStatus.RUNNING and pipeline.deleted_at is None:
            raise HTTPException(
                status_code=409, detail=f"Cannot delete workspace. Pipeline {pipeline.id} is currently RUNNING."
            )
        pipeline.deleted_at = now

    db.commit()
    return {"message": "Workspace successfully deleted"}
