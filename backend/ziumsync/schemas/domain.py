from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel

from ziumsync.models.domain import FormatType, PipelineStatus, SnapshotMode, SourceEngine, TargetEngine


class SourceConnectionUpdate(BaseModel):
    name: Optional[str] = None
    engine: Optional[SourceEngine] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    engine_config: Optional[Dict[str, Any]] = None
    credential_id: Optional[UUID] = None


class TargetConnectionUpdate(BaseModel):
    name: Optional[str] = None
    engine: Optional[TargetEngine] = None
    engine_config: Optional[Dict[str, Any]] = None
    credential_id: Optional[UUID] = None


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[PipelineStatus] = None
    snapshot_mode: Optional[SnapshotMode] = None
    key_format: Optional[FormatType] = None
    value_format: Optional[FormatType] = None
    advanced_properties: Optional[Dict[str, Any]] = None


class PipelineTableFilterCreate(BaseModel):
    schema_pattern: str
    table_pattern: str
    is_included: bool = True


class PipelineTransformCreate(BaseModel):
    name: str
    transform_type: str
    configuration: Dict[str, Any] = {}
    execution_order: int
