import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  userOverrides: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export function useFlags() {
  return useQuery({
    queryKey: ['admin', 'flags'],
    queryFn: () => api.get<{ data: FeatureFlag[] }>('/admin/flags').then((r) => r.data),
  });
}

export function useCreateFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; description?: string; enabled?: boolean }) =>
      api.post<{ data: FeatureFlag }>('/admin/flags', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flags'] }),
  });
}

export function useUpdateFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      patch,
    }: {
      key: string;
      patch: { description?: string | null; enabled?: boolean; userOverrides?: Record<string, boolean> };
    }) => api.patch<{ data: FeatureFlag }>(`/admin/flags/${key}`, patch).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flags'] }),
  });
}

export function useDeleteFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => api.delete(`/admin/flags/${key}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flags'] }),
  });
}
