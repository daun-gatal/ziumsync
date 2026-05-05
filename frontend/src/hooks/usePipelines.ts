import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  compilePipeline,
  createPipeline,
  deletePipeline,
  deployPipeline,
  getPipeline,
  getPipelines,
  updatePipeline,
  updatePipelineFilters,
  ApiError,
  getPipelineLogs,
  getPipelineLiveStatus,
  stopPipeline,
  restartPipeline,
} from '../lib/api';
import type {
  CreatePipelinePayload,
  PipelineTableFilterPayload,
  UpdatePipelinePayload,
} from '../lib/types';

const QK = 'pipelines';

export function usePipelines() {
  return useQuery({ queryKey: [QK], queryFn: getPipelines });
}

export function usePipeline(id: string) {
  return useQuery({ queryKey: [QK, id], queryFn: () => getPipeline(id), enabled: !!id });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePipelinePayload) => createPipeline(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Pipeline created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePipelinePayload }) =>
      updatePipeline(id, data),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: [QK] });
      void qc.invalidateQueries({ queryKey: [QK, updated.id] });
      toast.success('Pipeline updated');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to update pipeline'),
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePipeline(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Pipeline deleted');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to delete pipeline'),
  });
}

export function useDeployPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deployPipeline(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Start task queued');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useStopPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stopPipeline(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Stop task queued');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRestartPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restartPipeline(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Restart task queued');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCompilePipeline() {
  return useMutation({
    mutationFn: (id: string) => compilePipeline(id),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePipelineFilters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, filters }: { id: string; filters: PipelineTableFilterPayload[] }) =>
      updatePipelineFilters(id, filters),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: [QK, id] });
      toast.success('Filters saved');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to save filters'),
  });
}

export function usePipelineLogs(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [QK, id, 'logs'],
    queryFn: () => getPipelineLogs(id),
    enabled: enabled && !!id,
    refetchInterval: 3000,
  });
}

export function usePipelineLiveStatus(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [QK, id, 'live_status'],
    queryFn: () => getPipelineLiveStatus(id),
    enabled: enabled && !!id,
    refetchInterval: 3000,
  });
}
