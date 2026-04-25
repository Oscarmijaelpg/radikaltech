import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ScheduledReportKind =
  | 'news_digest'
  | 'competition_weekly'
  | 'brand_monthly'
  | 'custom';
export type ScheduledReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ScheduledReport {
  id: string;
  projectId: string;
  userId: string;
  kind: ScheduledReportKind;
  frequency: ScheduledReportFrequency;
  title: string;
  config: Record<string, unknown> | null;
  nextRunAt: string;
  lastRunAt: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useScheduledReports(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['scheduled-reports', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const r = await api.get<{ data: ScheduledReport[] }>(
        `/scheduled-reports?project_id=${projectId}`,
      );
      return r.data;
    },
  });
}

export function useCreateScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      kind: ScheduledReportKind;
      frequency: ScheduledReportFrequency;
      title: string;
      config?: Record<string, unknown>;
    }) => {
      const r = await api.post<{ data: ScheduledReport }>('/scheduled-reports', input);
      return r.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['scheduled-reports', v.project_id] });
    },
  });
}

export function useUpdateScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      project_id: string;
      patch: {
        enabled?: boolean;
        frequency?: ScheduledReportFrequency;
        title?: string;
        config?: Record<string, unknown>;
      };
    }) => {
      const r = await api.patch<{ data: ScheduledReport }>(
        `/scheduled-reports/${input.id}`,
        input.patch,
      );
      return r.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['scheduled-reports', v.project_id] });
    },
  });
}

export function useDeleteScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      await api.delete(`/scheduled-reports/${input.id}`);
      return input.id;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['scheduled-reports', v.project_id] });
    },
  });
}

export function useRunScheduledReportNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const r = await api.post<{ data: ScheduledReport }>(
        `/scheduled-reports/${input.id}/run-now`,
      );
      return r.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['scheduled-reports', v.project_id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
