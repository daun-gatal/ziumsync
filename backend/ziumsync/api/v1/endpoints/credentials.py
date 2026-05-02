from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ziumsync.api.deps import get_db
from ziumsync.models.domain import Credential

router = APIRouter()


@router.post("/", response_model=Credential)
def create_credential(credential: Credential, db: Session = Depends(get_db)):
    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential


@router.get("/", response_model=List[Credential])
def read_credentials(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    credentials = db.exec(select(Credential).offset(skip).limit(limit)).all()
    return credentials


@router.delete("/{credential_id}")
def delete_credential(credential_id: UUID, db: Session = Depends(get_db)):
    credential = db.get(Credential, credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")

    if credential.source_connections or credential.target_connections:
        raise HTTPException(
            status_code=409, detail="Cannot delete credential. It is currently mapped to existing connections."
        )

    db.delete(credential)
    db.commit()
    return {"message": "Credential successfully deleted"}
