import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  onboarding_completed: boolean;
  onboarding_step: string;
  avatar_url: string | null;
  language: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetail extends AdminUser {
  counts: { projects: number; chats: number; jobs: number };
  token_usage_total: { prompt_tokens: number; completion_tokens: number; cost_usd: number };
}

export interface UsersListFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: 'user' | 'admin';
  onboarded?: 'true' | 'false';
  sort?: '-createdAt' | 'createdAt' | 'email' | '-email';
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export function useAdminUsers(filters: UsersListFilters) {
  return useQuery({
    queryKey: ['admin', 'users', 'list', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AdminUser>>(`/admin/users${qs(filters as Record<string, string | number | undefined>)}`),
    placeholderData: (prev) => prev,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'users', 'detail', id],
    queryFn: () => api.get<{ data: AdminUserDetail }>(`/admin/users/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<AdminUser, 'role' | 'full_name' | 'language'>> }) =>
      api.patch<{ data: AdminUser }>(`/admin/users/${id}`, patch).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ data: { deleted: true } }>(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

export function useForceLogout() {
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: { logged_out: true } }>(`/admin/users/${id}/force-logout`),
  });
}

export function useExportUser() {
  return useMutation({
    mutationFn: (id: string) => api.get<{ data: unknown }>(`/admin/users/${id}/export`).then((r) => r.data),
  });
}

export interface ImpersonateResult {
  email: string;
  actionLink: string;
  expiresIn: string;
}

export function useImpersonate() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: ImpersonateResult }>(`/admin/users/${id}/impersonate`).then((r) => r.data),
  });
}
