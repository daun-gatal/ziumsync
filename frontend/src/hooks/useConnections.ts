import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createSourceConnection,
  createTargetConnection,
  deleteSourceConnection,
  deleteTargetConnection,
  getSourceConnections,
  getTargetConnections,
  updateSourceConnection,
  updateTargetConnection,
  ApiError,
} from '../lib/api';
import type {
  CreateSourceConnectionPayload,
  CreateTargetConnectionPayload,
  UpdateSourceConnectionPayload,
  UpdateTargetConnectionPayload,
} from '../lib/types';

const SQK = 'source-connections';
const TQK = 'target-connections';

// ─── Source ──────────────────────────────────────────────────────────────

export function useSourceConnections() {
  return useQuery({ queryKey: [SQK], queryFn: getSourceConnections });
}

export function useCreateSourceConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSourceConnectionPayload) => createSourceConnection(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [SQK] });
      toast.success('Source connection created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSourceConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSourceConnectionPayload }) =>
      updateSourceConnection(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [SQK] });
      toast.success('Source connection updated');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to update connection'),
  });
}

export function useDeleteSourceConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSourceConnection(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [SQK] });
      toast.success('Source connection deleted');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to delete connection'),
  });
}

// ─── Target ──────────────────────────────────────────────────────────────

export function useTargetConnections() {
  return useQuery({ queryKey: [TQK], queryFn: getTargetConnections });
}

export function useCreateTargetConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTargetConnectionPayload) => createTargetConnection(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TQK] });
      toast.success('Target connection created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTargetConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTargetConnectionPayload }) =>
      updateTargetConnection(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TQK] });
      toast.success('Target connection updated');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to update connection'),
  });
}

export function useDeleteTargetConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTargetConnection(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TQK] });
      toast.success('Target connection deleted');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to delete connection'),
  });
}
