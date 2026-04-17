import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ReportType = 'competition' | 'monthly_audit' | 'brand_strategy' | 'news' | 'general';

export interface Report {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  reportType: ReportType;
  content: string | null;
  summary: string | null;
  keyInsights: string[];
  version: number;
  sourceData: unknown;
  createdAt: string;
}

export function useReports(projectId: string | null | undefined, type?: ReportType) {
  return useQuery({
    queryKey: ['reports', projectId, type ?? null],
    enabled: !!projectId,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('project_id', projectId as string);
      if (type) qs.set('type', type);
      const r = await api.get<{ data: Report[] }>(`/reports?${qs.toString()}`);
      return r.data;
    },
  });
}

export function useReport(id: string | null | undefined) {
  return useQuery({
    queryKey: ['reports', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const r = await api.get<{ data: Report }>(`/reports/${id}`);
      return r.data;
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      await api.delete(`/reports/${id}`);
      return id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
    },
  });
}

export function useGenerateBrandStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string }) => {
      const r = await api.post<{ data: Report }>('/reports/generate/brand-strategy', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
    },
  });
}

export function useGenerateMonthlyAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string }) => {
      const r = await api.post<{ data: Report }>('/reports/generate/monthly-audit', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
    },
  });
}

export function useGenerateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; competitor_id: string }) => {
      const r = await api.post<{ data: Report }>('/reports/generate/competition', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
    },
  });
}

export function useGenerateUnified() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string }) => {
      const r = await api.post<{ data: Report }>('/reports/generate/unified', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
    },
  });
}

export function useAggregateNewsReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { topic: string; project_id: string }) => {
      const r = await api.post<{
        data: {
          jobId: string;
          report?: { id: string; title: string; summary: string | null; createdAt: string };
        };
      }>('/ai-services/aggregate-news', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
    },
  });
}
