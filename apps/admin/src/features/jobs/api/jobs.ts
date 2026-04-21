import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qs } from '@/shared/lib/qs';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface AdminJob {
  id: string;
  userId: string;
  projectId: string | null;
  kind: string;
  status: JobStatus;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  user: { id: string; email: string; fullName: string | null };
}

export interface JobKindCount {
  kind: string;
  count: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface JobsFilters {
  page?: number;
  pageSize?: number;
  status?: JobStatus;
  kind?: string;
  userId?: string;
  projectId?: string;
  from?: string;
  to?: string;
}

export function useAdminJobs(filters: JobsFilters) {
  return useQuery({
    queryKey: ['admin', 'jobs', 'list', filters],
    queryFn: () => api.get<PaginatedResponse<AdminJob>>(`/admin/jobs${qs(filters)}`),
    placeholderData: (prev) => prev,
    refetchInterval: 10_000,
  });
}

export function useJobKinds() {
  return useQuery({
    queryKey: ['admin', 'jobs', 'kinds'],
    queryFn: () => api.get<{ data: JobKindCount[] }>('/admin/jobs/kinds').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useAdminJob(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'jobs', 'detail', id],
    queryFn: () => api.get<{ data: AdminJob }>(`/admin/jobs/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: AdminJob }>(`/admin/jobs/${id}/retry`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    },
  });
}
