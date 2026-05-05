import enum
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import JSON
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Column, Field, Relationship, SQLModel

PortableJSON = JSON().with_variant(JSONB, "postgresql")


class AuthType(str, enum.Enum):
    NONE = "NONE"
    BASIC = "BASIC"
    SASL_JAAS = "SASL_JAAS"
    AWS_IAM = "AWS_IAM"


class SourceEngine(str, enum.Enum):
    POSTGRESQL = "POSTGRESQL"
    MYSQL = "MYSQL"


class TargetEngine(str, enum.Enum):
    KAFKA = "KAFKA"


class PipelineStatus(str, enum.Enum):
    STOPPED = "STOPPED"
    RUNNING = "RUNNING"
    FAILED = "FAILED"
    DEPLOYING = "DEPLOYING"
    STOPPING = "STOPPING"


class SnapshotMode(str, enum.Enum):
    INITIAL = "INITIAL"
    SCHEMA_ONLY = "SCHEMA_ONLY"
    NEVER = "NEVER"
    ALWAYS = "ALWAYS"


class FormatType(str, enum.Enum):
    JSON = "JSON"
    AVRO = "AVRO"
    PROTOBUF = "PROTOBUF"


class Workspace(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(index=True)
    deleted_at: Optional[datetime] = None

    # Relationships
    credentials: List["Credential"] = Relationship(back_populates="workspace")
    source_connections: List["SourceConnection"] = Relationship(back_populates="workspace")
    target_connections: List["TargetConnection"] = Relationship(back_populates="workspace")
    pipelines: List["Pipeline"] = Relationship(back_populates="workspace")


class Credential(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    name: str
    auth_type: AuthType = Field(sa_column=Column(SAEnum(AuthType)))
    encrypted_payload: Dict[str, Any] = Field(default={}, sa_column=Column(PortableJSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    workspace: Workspace = Relationship(back_populates="credentials")
    source_connections: List["SourceConnection"] = Relationship(back_populates="credential")
    target_connections: List["TargetConnection"] = Relationship(back_populates="credential")


class SourceConnection(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    name: str
    engine: SourceEngine = Field(sa_column=Column(SAEnum(SourceEngine)))
    host: str
    port: int
    database_name: str
    engine_config: Dict[str, Any] = Field(default={}, sa_column=Column(PortableJSON))
    credential_id: UUID = Field(foreign_key="credential.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    workspace: Workspace = Relationship(back_populates="source_connections")
    credential: Credential = Relationship(back_populates="source_connections")
    pipelines: List["Pipeline"] = Relationship(back_populates="source_connection")


class TargetConnection(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    name: str
    engine: TargetEngine = Field(sa_column=Column(SAEnum(TargetEngine)))
    engine_config: Dict[str, Any] = Field(default={}, sa_column=Column(PortableJSON))
    credential_id: UUID = Field(foreign_key="credential.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    workspace: Workspace = Relationship(back_populates="target_connections")
    credential: Credential = Relationship(back_populates="target_connections")
    pipelines: List["Pipeline"] = Relationship(back_populates="target_connection")


class Pipeline(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    name: str
    source_connection_id: UUID = Field(foreign_key="sourceconnection.id")
    target_connection_id: UUID = Field(foreign_key="targetconnection.id")
    status: PipelineStatus = Field(sa_column=Column(SAEnum(PipelineStatus)), default=PipelineStatus.STOPPED)
    current_deployment_id: Optional[str] = None
    snapshot_mode: SnapshotMode = Field(sa_column=Column(SAEnum(SnapshotMode)), default=SnapshotMode.INITIAL)
    key_format: FormatType = Field(sa_column=Column(SAEnum(FormatType)), default=FormatType.JSON)
    value_format: FormatType = Field(sa_column=Column(SAEnum(FormatType)), default=FormatType.JSON)
    advanced_properties: Dict[str, Any] = Field(default={}, sa_column=Column(PortableJSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[datetime] = None

    workspace: Workspace = Relationship(back_populates="pipelines")
    source_connection: SourceConnection = Relationship(back_populates="pipelines")
    target_connection: TargetConnection = Relationship(back_populates="pipelines")
    table_filters: List["PipelineTableFilter"] = Relationship(back_populates="pipeline", cascade_delete=True)
    transforms: List["PipelineTransform"] = Relationship(back_populates="pipeline", cascade_delete=True)


class PipelineTableFilter(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    pipeline_id: UUID = Field(foreign_key="pipeline.id", ondelete="CASCADE")
    schema_pattern: str
    table_pattern: str
    is_included: bool = True

    pipeline: Pipeline = Relationship(back_populates="table_filters")


class PipelineTransform(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    pipeline_id: UUID = Field(foreign_key="pipeline.id", ondelete="CASCADE")
    name: str
    transform_type: str
    configuration: Dict[str, Any] = Field(default={}, sa_column=Column(PortableJSON))
    execution_order: int

    pipeline: Pipeline = Relationship(back_populates="transforms")
