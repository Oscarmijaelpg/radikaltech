import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { qs } from '@/shared/lib/qs';

export interface AdminRecommendation {
  id: string;
  userId: string;
  projectId: string;
  kind: string;
  title: string;
  why: string;
  impact: 'high' | 'medium' | 'low';
  status: string;
  generatedAt: string;
  user: { id: string; email: string };
}

export interface AdminContentAsset {
  id: string;
  userId: string;
  projectId: string;
  assetUrl: string;
  assetType: 'image' | 'video' | 'document' | 'audio';
  aiDescription: string | null;
  createdAt: string;
  user: { id: string; email: string };
}

export interface AdminReport {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  reportType: string;
  createdAt: string;
  user: { id: string; email: string };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface ModerationFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  userId?: string;
  projectId?: string;
  status?: string;
  kind?: string;
}

export function useAdminRecommendations(filters: ModerationFilters) {
  return useQuery({
    queryKey: ['admin', 'moderation', 'recommendations', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AdminRecommendation>>(`/admin/moderation/recommendations${qs(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useDeleteRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/moderation/recommendations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moderation', 'recommendations'] }),
  });
}

export function useAdminContentAssets(filters: ModerationFilters) {
  return useQuery({
    queryKey: ['admin', 'moderation', 'content-assets', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AdminContentAsset>>(`/admin/moderation/content-assets${qs(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useDeleteContentAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/moderation/content-assets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moderation', 'content-assets'] }),
  });
}

export function useAdminReports(filters: ModerationFilters) {
  return useQuery({
    queryKey: ['admin', 'moderation', 'reports', filters],
    queryFn: () => api.get<PaginatedResponse<AdminReport>>(`/admin/moderation/reports${qs(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/moderation/reports/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moderation', 'reports'] }),
  });
}
