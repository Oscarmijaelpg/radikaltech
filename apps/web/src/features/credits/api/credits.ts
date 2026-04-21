import { useQuery } from '@tanstack/react-query';
import type { CreditTransaction } from '@radikal/shared';
import { api } from '@/lib/api';

export type { CreditTransaction };

export function useCreditBalance() {
  return useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.get<{ data: { balance: number } }>('/credits/me').then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useCreditHistory(limit = 50) {
  return useQuery({
    queryKey: ['credits', 'history', limit],
    queryFn: () =>
      api.get<{ data: CreditTransaction[] }>(`/credits/history?limit=${limit}`).then((r) => r.data),
    staleTime: 10_000,
  });
}
