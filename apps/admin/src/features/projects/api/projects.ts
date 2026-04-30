import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qs } from '@/shared/lib/qs';

export interface AdminProject {
  id: string;
  userId: string;
  name: string;
  companyName: string | null;
  industry: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; fullName: string | null };
}

export interface AdminSocialAccount {
  id: string;
  platform: string;
  handle: string | null;
  url: string | null;
  followers: number | null;
}

export interface AdminBrandProfile {
  id: string;
  essence: string | null;
  voiceTone: string | null;
  brandValues: string[];
  aiGenerated: boolean;
}

export interface AdminObjective {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
}

export interface AdminCompetitor {
  id: string;
  name: string;
  website: string | null;
  status: string;
}

export interface AdminProjectDetail extends AdminProject {
  socialAccounts: AdminSocialAccount[];
  brandProfile: AdminBrandProfile | null;
  objectives: AdminObjective[];
  competitors: AdminCompetitor[];
  _count: {
    chats: number;
    contentAssets: number;
    reports: number;
    memories: number;
    aiJobs: number;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface ProjectsFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  userId?: string;
  industry?: string;
}

export function useAdminProjects(filters: ProjectsFilters) {
  return useQuery({
    queryKey: ['admin', 'projects', 'list', filters],
    queryFn: () => api.get<PaginatedResponse<AdminProject>>(`/admin/projects${qs(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useAdminProject(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'projects', 'detail', id],
    queryFn: () => api.get<{ data: AdminProjectDetail }>(`/admin/projects/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ data: { deleted: true } }>(`/admin/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export type ReanalyzeKind = 'website' | 'competitors' | 'brand';

export function useReanalyzeProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: ReanalyzeKind }) =>
      api.post<{ data: { queued: true; kind: ReanalyzeKind } }>(`/admin/projects/${id}/reanalyze`, {
        kind,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    },
  });
}
