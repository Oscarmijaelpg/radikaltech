import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ProviderOverview {
  provider: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface ProviderFailures {
  total: number;
  byKind: Array<{ kind: string; count: number }>;
  byProviderHint: Array<{ provider: string; count: number }>;
  recent: Array<{ id: string; kind: string; error: string | null; createdAt: string }>;
}

export function useProvidersOverview() {
  return useQuery({
    queryKey: ['admin', 'providers', 'overview'],
    queryFn: () =>
      api.get<{ data: ProviderOverview[] }>('/admin/providers/overview').then((r) => r.data),
  });
}

export function useProvidersFailures() {
  return useQuery({
    queryKey: ['admin', 'providers', 'failures'],
    queryFn: () =>
      api.get<{ data: ProviderFailures }>('/admin/providers/failures').then((r) => r.data),
  });
}
