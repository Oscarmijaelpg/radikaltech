import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreditTransaction } from '@radikal/shared';
import { api } from '@/lib/api';

export type { CreditTransaction };

export interface UserCredits {
  balance: number;
  history: CreditTransaction[];
}

export function useUserCredits(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'users', 'credits', userId],
    queryFn: () =>
      api.get<{ data: UserCredits }>(`/admin/users/${userId}/credits`).then((r) => r.data),
    enabled: !!userId,
  });
}

export interface AdjustCreditsInput {
  userId: string;
  amount: number;
  reason: string;
}

export function useAdjustUserCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, amount, reason }: AdjustCreditsInput) =>
      api
        .post<{ data: { balance: number; applied: number } }>(
          `/admin/users/${userId}/credits/adjust`,
          { amount, reason },
        )
        .then((r) => r.data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'credits', vars.userId] });
    },
  });
}
