import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ScheduledPostStatus = 'scheduled' | 'published' | 'cancelled' | 'failed';
export type ScheduledPostPlatform =
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'facebook'
  | 'x'
  | 'threads'
  | 'pinterest'
  | 'youtube'
  | 'other';

export interface ScheduledPost {
  id: string;
  project_id: string;
  user_id: string;
  asset_id: string | null;
  platforms: ScheduledPostPlatform[];
  caption: string | null;
  hashtags: string[];
  scheduled_at: string;
  status: ScheduledPostStatus;
  published_at: string | null;
  external_ids: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledPostFilters {
  status?: ScheduledPostStatus;
  from?: string;
  to?: string;
}

export interface CreateScheduledPostInput {
  project_id: string;
  asset_id?: string | null;
  platforms: ScheduledPostPlatform[];
  caption?: string | null;
  hashtags?: string[];
  scheduled_at: string;
  notes?: string | null;
}

export interface UpdateScheduledPostInput {
  id: string;
  project_id: string;
  asset_id?: string | null;
  platforms?: ScheduledPostPlatform[];
  caption?: string | null;
  hashtags?: string[];
  scheduled_at?: string;
  notes?: string | null;
  status?: ScheduledPostStatus;
}

export function useScheduledPosts(
  projectId: string | null | undefined,
  filters: ScheduledPostFilters = {},
) {
  return useQuery({
    queryKey: ['scheduled-posts', 'list', projectId, filters],
    enabled: !!projectId,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('project_id', projectId as string);
      if (filters.status) qs.set('status', filters.status);
      if (filters.from) qs.set('from', filters.from);
      if (filters.to) qs.set('to', filters.to);
      const r = await api.get<{ data: ScheduledPost[] }>(`/scheduled-posts?${qs.toString()}`);
      return r.data;
    },
  });
}

export function useUpcomingScheduledPosts(enabled = true, limit = 5) {
  return useQuery({
    queryKey: ['scheduled-posts', 'upcoming', limit],
    enabled,
    queryFn: async () => {
      const r = await api.get<{ data: ScheduledPost[] }>(`/scheduled-posts/upcoming?limit=${limit}`);
      return r.data;
    },
  });
}

export function useCreateScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateScheduledPostInput) => {
      const r = await api.post<{ data: ScheduledPost }>('/scheduled-posts', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
    },
  });
}

export function useUpdateScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id: _pid, ...patch }: UpdateScheduledPostInput) => {
      const r = await api.patch<{ data: ScheduledPost }>(`/scheduled-posts/${id}`, patch);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
    },
  });
}

export function useMoveScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      scheduled_at,
    }: {
      id: string;
      project_id: string;
      scheduled_at: string;
    }) => {
      const r = await api.patch<{ data: ScheduledPost }>(`/scheduled-posts/${id}`, {
        scheduled_at,
      });
      return r.data;
    },
    onMutate: async ({ id, project_id, scheduled_at }) => {
      await qc.cancelQueries({ queryKey: ['scheduled-posts', 'list', project_id] });
      const prev = qc.getQueriesData<ScheduledPost[]>({
        queryKey: ['scheduled-posts', 'list', project_id],
      });
      qc.setQueriesData<ScheduledPost[]>(
        { queryKey: ['scheduled-posts', 'list', project_id] },
        (old) => old?.map((p) => (p.id === id ? { ...p, scheduled_at } : p)) ?? old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
    },
  });
}

export function useCancelScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const r = await api.post<{ data: ScheduledPost }>(`/scheduled-posts/${id}/cancel`);
      return r.data;
    },
    onMutate: async ({ id, project_id }) => {
      await qc.cancelQueries({ queryKey: ['scheduled-posts', 'list', project_id] });
      const prev = qc.getQueriesData<ScheduledPost[]>({
        queryKey: ['scheduled-posts', 'list', project_id],
      });
      qc.setQueriesData<ScheduledPost[]>(
        { queryKey: ['scheduled-posts', 'list', project_id] },
        (old) => old?.map((p) => (p.id === id ? { ...p, status: 'cancelled' as const } : p)) ?? old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
    },
  });
}

export function useDeleteScheduledPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      await api.delete(`/scheduled-posts/${id}`);
      return id;
    },
    onMutate: async ({ id, project_id }) => {
      await qc.cancelQueries({ queryKey: ['scheduled-posts', 'list', project_id] });
      const prev = qc.getQueriesData<ScheduledPost[]>({
        queryKey: ['scheduled-posts', 'list', project_id],
      });
      qc.setQueriesData<ScheduledPost[]>(
        { queryKey: ['scheduled-posts', 'list', project_id] },
        (old) => old?.filter((p) => p.id !== id) ?? old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
    },
  });
}
