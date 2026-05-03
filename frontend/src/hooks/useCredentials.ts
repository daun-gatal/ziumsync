import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createCredential,
  deleteCredential,
  getCredentials,
  ApiError,
} from '../lib/api';
import type { CreateCredentialPayload } from '../lib/types';

const QK = 'credentials';

export function useCredentials() {
  return useQuery({ queryKey: [QK], queryFn: getCredentials });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCredentialPayload) => createCredential(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Credential created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Credential deleted');
    },
    onError: (e: ApiError) =>
      toast.error(e.status === 409 ? e.message : 'Failed to delete credential'),
  });
}
