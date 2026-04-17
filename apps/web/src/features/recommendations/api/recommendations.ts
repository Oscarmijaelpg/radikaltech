import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type RecommendationStatus =
  | 'new'
  | 'saved'
  | 'in_progress'
  | 'completed'
  | 'dismissed';

export type RecommendationKind =
  | 'post'
  | 'campaign'
  | 'strategy'
  | 'report'
  | 'content_improvement'
  | 'competitor_response'
  | 'news_reaction';

export type RecommendationImpact = 'high' | 'medium' | 'low';

export type RecommendationActionKind =
  | 'navigate_image_gen'
  | 'navigate_chat'
  | 'create_scheduled_post'
  | 'open_competitor'
  | 'generate_report'
  | 'open_news'
  | 'custom';

export interface RecommendationSource {
  type: 'news' | 'competitor' | 'brand' | 'asset' | 'memory' | string;
  id?: string;
  title?: string;
  url?: string;
}

export interface Recommendation {
  id: string;
  projectId: string;
  userId: string;
  kind: RecommendationKind;
  title: string;
  why: string;
  actionLabel: string;
  actionKind: RecommendationActionKind | string;
  actionPayload: Record<string, unknown> | null;
  impact: RecommendationImpact;
  sources: RecommendationSource[];
  status: RecommendationStatus;
  userNotes: string | null;
  completedAt: string | null;
  generatedAt: string;
  updatedAt: string;
}

export interface ListFilters {
  status?: RecommendationStatus;
  kind?: RecommendationKind;
}

export function useRecommendations(
  projectId: string | null | undefined,
  filters?: ListFilters,
) {
  return useQuery({
    queryKey: ['recommendations', projectId, filters?.status ?? null, filters?.kind ?? null],
    enabled: !!projectId,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('project_id', projectId as string);
      if (filters?.status) qs.set('status', filters.status);
      if (filters?.kind) qs.set('kind', filters.kind);
      const r = await api.get<{ data: Recommendation[] }>(`/recommendations?${qs.toString()}`);
      return r.data;
    },
  });
}

export function useRecommendation(id: string | null | undefined) {
  return useQuery({
    queryKey: ['recommendations', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const r = await api.get<{ data: Recommendation }>(`/recommendations/${id}`);
      return r.data;
    },
  });
}

export function useUpdateRecommendationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      project_id: string;
      status: RecommendationStatus;
    }) => {
      const r = await api.patch<{ data: Recommendation }>(`/recommendations/${input.id}`, {
        status: input.status,
      });
      return r.data;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['recommendations', input.project_id] });
      const prev = qc.getQueriesData<Recommendation[]>({
        queryKey: ['recommendations', input.project_id],
      });
      qc.setQueriesData<Recommendation[]>(
        { queryKey: ['recommendations', input.project_id] },
        (old) =>
          old?.map((r) => (r.id === input.id ? { ...r, status: input.status } : r)) ?? old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: (_d, _e, input) => {
      qc.invalidateQueries({ queryKey: ['recommendations', input.project_id] });
    },
  });
}

export function useAddRecommendationNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      project_id: string;
      user_notes: string | null;
    }) => {
      const r = await api.patch<{ data: Recommendation }>(`/recommendations/${input.id}`, {
        user_notes: input.user_notes,
      });
      return r.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['recommendations', v.project_id] });
    },
  });
}

export function useDeleteRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      await api.delete(`/recommendations/${input.id}`);
      return input.id;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['recommendations', v.project_id] });
    },
  });
}

export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string }) => {
      const r = await api.post<{
        data: { jobId: string; count: number; items: Recommendation[] };
      }>('/recommendations/generate', input);
      return r.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['recommendations', v.project_id] });
    },
  });
}
