// All TypeScript types mirroring the ZiumSync backend domain models exactly.

export type AuthType = 'NONE' | 'BASIC' | 'SASL_JAAS' | 'AWS_IAM';
export type SourceEngine = 'POSTGRESQL' | 'MYSQL';
export type TargetEngine = 'KAFKA';
export type PipelineStatus = 'STOPPED' | 'RUNNING' | 'FAILED' | 'DEPLOYING' | 'STOPPING';
export type SnapshotMode = 'INITIAL' | 'SCHEMA_ONLY' | 'NEVER' | 'ALWAYS';
export type FormatType = 'JSON' | 'AVRO' | 'PROTOBUF';

export interface Workspace {
  id: string;
  name: string;
  deleted_at: string | null;
}

export interface Credential {
  id: string;
  workspace_id: string;
  name: string;
  auth_type: AuthType;
  encrypted_payload: Record<string, string>;
  created_at: string;
}

export interface SourceConnection {
  id: string;
  workspace_id: string;
  name: string;
  engine: SourceEngine;
  host: string;
  port: number;
  database_name: string;
  engine_config: Record<string, unknown>;
  credential_id: string;
  created_at: string;
}

export interface TargetConnection {
  id: string;
  workspace_id: string;
  name: string;
  engine: TargetEngine;
  engine_config: Record<string, unknown>;
  credential_id: string;
  created_at: string;
}

export interface PipelineTableFilter {
  id: string;
  pipeline_id: string;
  schema_pattern: string;
  table_pattern: string;
  is_included: boolean;
}

export interface PipelineTransform {
  id: string;
  pipeline_id: string;
  name: string;
  transform_type: string;
  configuration: Record<string, unknown>;
  execution_order: number;
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  source_connection_id: string;
  target_connection_id: string;
  status: PipelineStatus;
  current_deployment_id: string | null;
  snapshot_mode: SnapshotMode;
  key_format: FormatType;
  value_format: FormatType;
  advanced_properties: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;
  table_filters: PipelineTableFilter[];
  transforms: PipelineTransform[];
}

// ─── API payload types ────────────────────────────────────────────────────

export interface CreateWorkspacePayload {
  name: string;
}

export interface CreateCredentialPayload {
  workspace_id: string;
  name: string;
  auth_type: AuthType;
  encrypted_payload: Record<string, string>;
}

export interface CreateSourceConnectionPayload {
  workspace_id: string;
  name: string;
  engine: SourceEngine;
  host: string;
  port: number;
  database_name: string;
  engine_config: Record<string, unknown>;
  credential_id: string;
}

export interface UpdateSourceConnectionPayload {
  name?: string;
  engine?: SourceEngine;
  host?: string;
  port?: number;
  database_name?: string;
  engine_config?: Record<string, unknown>;
  credential_id?: string;
}

export interface CreateTargetConnectionPayload {
  workspace_id: string;
  name: string;
  engine: TargetEngine;
  engine_config: Record<string, unknown>;
  credential_id: string;
}

export interface UpdateTargetConnectionPayload {
  name?: string;
  engine?: TargetEngine;
  engine_config?: Record<string, unknown>;
  credential_id?: string;
}

export interface CreatePipelinePayload {
  workspace_id: string;
  name: string;
  source_connection_id: string;
  target_connection_id: string;
  snapshot_mode?: SnapshotMode;
  key_format?: FormatType;
  value_format?: FormatType;
  advanced_properties?: Record<string, unknown>;
}

export interface UpdatePipelinePayload {
  name?: string;
  status?: PipelineStatus;
  snapshot_mode?: SnapshotMode;
  key_format?: FormatType;
  value_format?: FormatType;
  advanced_properties?: Record<string, unknown>;
}

export interface PipelineTableFilterPayload {
  schema_pattern: string;
  table_pattern: string;
  is_included: boolean;
}
