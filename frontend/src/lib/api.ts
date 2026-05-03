/// <reference types="vite/client" />
import type {
  Credential,
  CreateCredentialPayload,
  CreatePipelinePayload,
  CreateSourceConnectionPayload,
  CreateTargetConnectionPayload,
  CreateWorkspacePayload,
  Pipeline,
  PipelineTableFilter,
  PipelineTableFilterPayload,
  SourceConnection,
  TargetConnection,
  UpdatePipelinePayload,
  UpdateSourceConnectionPayload,
  UpdateTargetConnectionPayload,
  Workspace,
} from './types';

// Health is at /health (not under /api/v1)
const API_ROOT = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api/v1';
const HEALTH_URL = API_ROOT.replace('/api/v1', '') + '/health';

// ─── Error class ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    throw new ApiError(msg, res.status);
  }
  // Some DELETE endpoints return { message } — still valid JSON
  return res.json() as Promise<T>;
}

// ─── Health ───────────────────────────────────────────────────────────────

export const getHealth = (): Promise<{ status: string }> =>
  fetch(HEALTH_URL).then((r) => r.json());

// ─── Workspaces ───────────────────────────────────────────────────────────

export const getWorkspaces = (): Promise<Workspace[]> =>
  apiFetch('/workspaces/');

export const createWorkspace = (data: CreateWorkspacePayload): Promise<Workspace> =>
  apiFetch('/workspaces/', { method: 'POST', body: JSON.stringify(data) });

export const deleteWorkspace = (id: string): Promise<{ message: string }> =>
  apiFetch(`/workspaces/${id}`, { method: 'DELETE' });

// ─── Credentials ─────────────────────────────────────────────────────────

export const getCredentials = (): Promise<Credential[]> =>
  apiFetch('/credentials/');

export const createCredential = (data: CreateCredentialPayload): Promise<Credential> =>
  apiFetch('/credentials/', { method: 'POST', body: JSON.stringify(data) });

export const deleteCredential = (id: string): Promise<{ message: string }> =>
  apiFetch(`/credentials/${id}`, { method: 'DELETE' });

// ─── Source Connections ───────────────────────────────────────────────────

export const getSourceConnections = (): Promise<SourceConnection[]> =>
  apiFetch('/connections/source');

export const createSourceConnection = (data: CreateSourceConnectionPayload): Promise<SourceConnection> =>
  apiFetch('/connections/source', { method: 'POST', body: JSON.stringify(data) });

export const updateSourceConnection = (id: string, data: UpdateSourceConnectionPayload): Promise<SourceConnection> =>
  apiFetch(`/connections/source/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteSourceConnection = (id: string): Promise<{ message: string }> =>
  apiFetch(`/connections/source/${id}`, { method: 'DELETE' });

// ─── Target Connections ───────────────────────────────────────────────────

export const getTargetConnections = (): Promise<TargetConnection[]> =>
  apiFetch('/connections/target');

export const createTargetConnection = (data: CreateTargetConnectionPayload): Promise<TargetConnection> =>
  apiFetch('/connections/target', { method: 'POST', body: JSON.stringify(data) });

export const updateTargetConnection = (id: string, data: UpdateTargetConnectionPayload): Promise<TargetConnection> =>
  apiFetch(`/connections/target/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteTargetConnection = (id: string): Promise<{ message: string }> =>
  apiFetch(`/connections/target/${id}`, { method: 'DELETE' });

// ─── Pipelines ────────────────────────────────────────────────────────────

export const getPipelines = (): Promise<Pipeline[]> =>
  apiFetch('/pipelines/');

export const getPipeline = (id: string): Promise<Pipeline> =>
  apiFetch(`/pipelines/${id}`);

export const createPipeline = (data: CreatePipelinePayload): Promise<Pipeline> =>
  apiFetch('/pipelines/', { method: 'POST', body: JSON.stringify(data) });

export const updatePipeline = (id: string, data: UpdatePipelinePayload): Promise<Pipeline> =>
  apiFetch(`/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deletePipeline = (id: string): Promise<{ message: string }> =>
  apiFetch(`/pipelines/${id}`, { method: 'DELETE' });

export const deployPipeline = (id: string): Promise<{ message: string; pipeline_id: string }> =>
  apiFetch(`/pipelines/${id}/deploy`, { method: 'POST' });

export const compilePipeline = (id: string): Promise<{ properties: string }> =>
  apiFetch(`/pipelines/${id}/compile`);

export const updatePipelineFilters = (
  id: string,
  filters: PipelineTableFilterPayload[]
): Promise<PipelineTableFilter[]> =>
  apiFetch(`/pipelines/${id}/filters`, { method: 'PUT', body: JSON.stringify(filters) });
