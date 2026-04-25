import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface StatsOverview {
  users: { total: number; new24h: number; new7d: number; onboarded: number };
  projects: { total: number };
  jobs: { running: number; failed24h: number; succeeded24h: number };
  tokenUsage30d: { promptTokens: number; completionTokens: number; costUsd: number };
}

export interface SignupPoint {
  date: string;
  count: number;
}

export interface TokenUsageRow {
  provider: string;
  model: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface JobsTrendPoint {
  date: string;
  status: string;
  count: number;
}

export interface StatsRange {
  from?: string;
  to?: string;
}

function qs(params: Record<string, string | undefined> | object): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export function useStatsOverview() {
  return useQuery({
    queryKey: ['admin', 'stats', 'overview'],
    queryFn: () => api.get<{ data: StatsOverview }>('/admin/stats/overview').then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useSignups(range: StatsRange) {
  return useQuery({
    queryKey: ['admin', 'stats', 'signups', range],
    queryFn: () =>
      api
        .get<{ data: SignupPoint[] }>(`/admin/stats/signups${qs(range)}`)
        .then((r) => r.data),
  });
}

export function useTokenUsage(range: StatsRange & { provider?: string; model?: string }) {
  return useQuery({
    queryKey: ['admin', 'stats', 'token-usage', range],
    queryFn: () =>
      api
        .get<{ data: TokenUsageRow[] }>(`/admin/stats/token-usage${qs(range)}`)
        .then((r) => r.data),
  });
}

export function useJobsTrend(range: StatsRange & { status?: string; kind?: string }) {
  return useQuery({
    queryKey: ['admin', 'stats', 'jobs-trend', range],
    queryFn: () =>
      api
        .get<{ data: JobsTrendPoint[] }>(`/admin/stats/jobs-trend${qs(range)}`)
        .then((r) => r.data),
  });
}
