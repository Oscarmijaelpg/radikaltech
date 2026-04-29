import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SocialAccount } from './types';

export function useSocialAccounts(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['social-accounts', projectId],
    queryFn: async () => {
      const r = await api.get<{ data: SocialAccount[] }>(
        `/social-accounts?project_id=${projectId}`,
      );
      return r.data;
    },
    enabled: !!projectId,
  });
}

export interface CreateSocialAccountInput {
  project_id: string;
  platform: string;
  source: 'url' | 'manual';
  url?: string;
  handle?: string;
  manual_description?: string;
}

export function useCreateSocialAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSocialAccountInput) => {
      const r = await api.post<{ data: SocialAccount }>('/social-accounts', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['social-accounts', vars.project_id] });
    },
  });
}

export function useUpdateSocialAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      project_id: _pid,
      ...input
    }: { id: string; project_id: string } & Partial<CreateSocialAccountInput>) => {
      const r = await api.patch<{ data: SocialAccount }>(`/social-accounts/${id}`, input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['social-accounts', vars.project_id] });
    },
  });
}

export function useDeleteSocialAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      await api.delete(`/social-accounts/${id}`);
      return id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['social-accounts', vars.project_id] });
    },
  });
}

export function useSyncSocialProject() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const r = await api.post<{ data: { scheduled: number } }>(
        `/social-accounts/sync-project/${projectId}`,
      );
      return r.data;
    },
  });
}
