import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qs } from '@/shared/lib/qs';

export interface ScheduledReport {
  id: string;
  projectId: string;
  userId: string;
  kind: 'news_digest' | 'competition_weekly' | 'brand_monthly' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly';
  title: string;
  nextRunAt: string;
  lastRunAt: string | null;
  enabled: boolean;
  createdAt: string;
  user: { id: string; email: string };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface ScheduledReportsFilters {
  page?: number;
  pageSize?: number;
  userId?: string;
  projectId?: string;
  kind?: string;
  enabled?: boolean;
}

export function useScheduledReports(filters: ScheduledReportsFilters) {
  return useQuery({
    queryKey: ['admin', 'scheduled-reports', filters],
    queryFn: () =>
      api.get<PaginatedResponse<ScheduledReport>>(`/admin/scheduled-reports${qs(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useToggleScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch<{ data: ScheduledReport }>(`/admin/scheduled-reports/${id}`, { enabled }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'scheduled-reports'] }),
  });
}

export function useRunScheduledReportNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: ScheduledReport }>(`/admin/scheduled-reports/${id}/run-now`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'scheduled-reports'] }),
  });
}
