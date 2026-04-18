import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AnalysisMode,
  Competitor,
  CompetitorAnalysisResult,
  CompetitorStats,
  ScrapeNetwork,
  SocialPostItem,
} from './types';

export function useCompetitors(
  projectId: string | null | undefined,
  status: 'confirmed' | 'suggested' | 'rejected' | 'all' = 'all',
) {
  return useQuery({
    queryKey: ['competitors', projectId, status],
    queryFn: async () => {
      const r = await api.get<{ data: Competitor[] }>(
        `/competitors?project_id=${projectId}&status=${status}`,
      );
      return r.data;
    },
    enabled: !!projectId,
  });
}

export function useDetectCompetitors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string }) => {
      const r = await api.post<{
        data: {
          jobId: string;
          competitors: Array<{
            id: string;
            name: string;
            website: string | null;
            description: string | null;
            country: string | null;
            why_competitor: string | null;
          }>;
        };
      }>('/ai-services/detect-competitors', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
    },
  });
}

function updateCompetitorInCache(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string,
  updater: (list: Competitor[]) => Competitor[],
) {
  qc.setQueriesData<Competitor[]>({ queryKey: ['competitors', projectId] }, (old) =>
    old ? updater(old) : old,
  );
}

export function useApproveCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const r = await api.patch<{ data: Competitor }>(`/competitors/${id}/approve`, {});
      return r.data;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['competitors', vars.project_id] });
      updateCompetitorInCache(qc, vars.project_id, (list) =>
        list.map((c) => (c.id === vars.id ? { ...c, status: 'confirmed' as const } : c)),
      );
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
    },
  });
}

export function useRejectCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const r = await api.patch<{ data: Competitor }>(`/competitors/${id}/reject`, {});
      return r.data;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['competitors', vars.project_id] });
      // Lo removemos de la UI inmediatamente
      updateCompetitorInCache(qc, vars.project_id, (list) =>
        list.filter((c) => c.id !== vars.id),
      );
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
    },
  });
}

export function useBulkApproveCompetitors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[]; project_id: string }) => {
      const r = await api.post<{ data: { updated: number } }>('/competitors/bulk-approve', { ids });
      return r.data;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['competitors', vars.project_id] });
      const set = new Set(vars.ids);
      updateCompetitorInCache(qc, vars.project_id, (list) =>
        list.map((c) => (set.has(c.id) ? { ...c, status: 'confirmed' as const } : c)),
      );
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
    },
  });
}

export function useBulkRejectCompetitors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, project_id }: { ids: string[]; project_id: string }) => {
      await Promise.all(ids.map((id) => api.patch(`/competitors/${id}/reject`, {})));
      return { updated: ids.length, project_id };
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['competitors', vars.project_id] });
      const set = new Set(vars.ids);
      updateCompetitorInCache(qc, vars.project_id, (list) =>
        list.filter((c) => !set.has(c.id)),
      );
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
    },
  });
}

export interface CreateCompetitorInput {
  project_id: string;
  name: string;
  website?: string | null;
  notes?: string | null;
  social_links?: Record<string, string> | null;
}

export function useCreateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCompetitorInput) => {
      const r = await api.post<{ data: Competitor }>('/competitors', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
    },
  });
}

export interface UpdateCompetitorInput {
  id: string;
  project_id: string;
  name?: string;
  website?: string | null;
  notes?: string | null;
  social_links?: Record<string, string> | null;
}

export function useUpdateCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id: _pid, ...input }: UpdateCompetitorInput) => {
      const r = await api.patch<{ data: Competitor }>(`/competitors/${id}`, input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
    },
  });
}

export function useDeleteCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      await api.delete(`/competitors/${id}`);
      return id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
    },
  });
}

export function useAnalyzeCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      mode,
      networks,
    }: {
      id: string;
      project_id: string;
      mode?: AnalysisMode;
      networks?: ScrapeNetwork[];
    }) => {
      const r = await api.post<{
        data: {
          competitor: Competitor;
          result: CompetitorAnalysisResult | null;
          sync_status: Record<string, { synced_at: string; post_count: number; handle?: string }>;
          social_stats: unknown;
        };
      }>(`/competitors/${id}/analyze`, mode || networks ? { mode, networks } : undefined);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
      qc.invalidateQueries({ queryKey: ['competitor-stats', vars.id] });
      qc.invalidateQueries({ queryKey: ['competitor-posts', vars.id] });
    },
  });
}

export function useCompetitorStats(competitorId: string | null | undefined) {
  return useQuery({
    queryKey: ['competitor-stats', competitorId],
    queryFn: async () => {
      const r = await api.get<{ data: CompetitorStats }>(`/competitors/${competitorId}/stats`);
      return r.data;
    },
    enabled: !!competitorId,
  });
}

export function useCompetitorPosts(
  competitorId: string | null | undefined,
  filters?: { platform?: string; limit?: number },
) {
  return useQuery({
    queryKey: ['competitor-posts', competitorId, filters?.platform ?? null, filters?.limit ?? null],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.platform) qs.set('platform', filters.platform);
      if (filters?.limit) qs.set('limit', String(filters.limit));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const r = await api.get<{ data: SocialPostItem[] }>(`/competitors/${competitorId}/posts${suffix}`);
      return r.data;
    },
    enabled: !!competitorId,
  });
}

export interface ScrapeInstagramInput {
  handle: string;
  project_id: string;
  competitor_id?: string;
}

// ---------- Benchmark & Gaps ----------

export interface BenchmarkFormatMix {
  [format: string]: number;
}

export interface BrandSnapshot {
  name: string;
  social_posts_count: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number;
  posts_per_week: number;
  format_mix: BenchmarkFormatMix;
  best_performing_platform: string | null;
  engagement_score: number;
  platforms: string[];
}

export interface CompetitorSnapshot extends BrandSnapshot {
  id: string;
  my_vs_them: {
    engagement_ratio: number;
    frequency_ratio: number;
    verdict: 'ahead' | 'parity' | 'behind';
  };
}

export interface BenchmarkResult {
  my_brand: BrandSnapshot;
  competitors: CompetitorSnapshot[];
  overall_position: 'leader' | 'strong' | 'developing' | 'behind';
  summary: string;
}

export interface ContentGap {
  format: string;
  competitors_using: string[];
  my_usage: number;
  opportunity_score: number;
}

export interface TemporalGap {
  weekday: string;
  competitors_active: number;
  me_active: boolean;
}

export interface GapAnalysis {
  content_gaps: ContentGap[];
  temporal_gaps: TemporalGap[];
  theme_gaps: string[];
}

export function useCompetitorBenchmark(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['competitors-benchmark', projectId],
    queryFn: async () => {
      const r = await api.get<{ data: BenchmarkResult }>(`/competitors/benchmark?project_id=${projectId}`);
      return r.data;
    },
    enabled: !!projectId,
  });
}

export function useCompetitorGaps(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['competitors-gaps', projectId],
    queryFn: async () => {
      const r = await api.get<{ data: GapAnalysis }>(`/competitors/gaps?project_id=${projectId}`);
      return r.data;
    },
    enabled: !!projectId,
  });
}

export function useScrapeInstagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScrapeInstagramInput) => {
      const r = await api.post<{ data: unknown }>('/ai-services/scrape-instagram', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      if (vars.competitor_id) {
        qc.invalidateQueries({ queryKey: ['competitor-stats', vars.competitor_id] });
        qc.invalidateQueries({ queryKey: ['competitor-posts', vars.competitor_id] });
      }
    },
  });
}

export interface ScrapeTikTokInput {
  handle: string;
  project_id: string;
  competitor_id?: string;
}

export function useScrapeTiktok() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScrapeTikTokInput) => {
      const r = await api.post<{ data: unknown }>('/ai-services/scrape-tiktok', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      if (vars.competitor_id) {
        qc.invalidateQueries({ queryKey: ['competitor-stats', vars.competitor_id] });
        qc.invalidateQueries({ queryKey: ['competitor-posts', vars.competitor_id] });
      }
    },
  });
}
