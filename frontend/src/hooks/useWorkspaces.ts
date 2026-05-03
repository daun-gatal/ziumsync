import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  ApiError,
} from '../lib/api';
import type { CreateWorkspacePayload } from '../lib/types';

const QK = 'workspaces';

export function useWorkspaces() {
  return useQuery({ queryKey: [QK], queryFn: getWorkspaces });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkspacePayload) => createWorkspace(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Workspace created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Workspace deleted');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to delete workspace'),
  });
}
