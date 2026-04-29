import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SystemConfigEntry {
  key: string;
  value: unknown;
  updatedAt: string;
}

export function useSystemConfig() {
  return useQuery({
    queryKey: ['admin', 'system-config'],
    queryFn: () =>
      api.get<{ data: SystemConfigEntry[] }>('/admin/system-config').then((r) => r.data),
  });
}

export function useUpsertSystemConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api
        .put<{ data: SystemConfigEntry }>(`/admin/system-config/${key}`, { value })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'system-config'] }),
  });
}
