import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActionPrice, ActionPricePatch } from '@radikal/shared';
import { api } from '@/lib/api';

export type { ActionPrice, ActionPricePatch };

export function useActionPrices() {
  return useQuery({
    queryKey: ['admin', 'action-prices'],
    queryFn: () => api.get<{ data: ActionPrice[] }>('/admin/action-prices').then((r) => r.data),
  });
}

export function useUpdateActionPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, patch }: { key: string; patch: ActionPricePatch }) =>
      api
        .patch<{ data: ActionPrice }>(`/admin/action-prices/${key}`, patch)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'action-prices'] }),
  });
}
