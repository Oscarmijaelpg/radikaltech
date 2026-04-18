import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useCompetitors(projectId, status = 'all') {
    return useQuery({
        queryKey: ['competitors', projectId, status],
        queryFn: async () => {
            const r = await api.get(`/competitors?project_id=${projectId}&status=${status}`);
            return r.data;
        },
        enabled: !!projectId,
    });
}
export function useDetectCompetitors() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai-services/detect-competitors', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
        },
    });
}
function updateCompetitorInCache(qc, projectId, updater) {
    qc.setQueriesData({ queryKey: ['competitors', projectId] }, (old) => old ? updater(old) : old);
}
export function useApproveCompetitor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            const r = await api.patch(`/competitors/${id}/approve`, {});
            return r.data;
        },
        onMutate: async (vars) => {
            await qc.cancelQueries({ queryKey: ['competitors', vars.project_id] });
            updateCompetitorInCache(qc, vars.project_id, (list) => list.map((c) => (c.id === vars.id ? { ...c, status: 'confirmed' } : c)));
        },
        onSettled: (_d, _e, vars) => {
            qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
        },
    });
}
export function useRejectCompetitor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            const r = await api.patch(`/competitors/${id}/reject`, {});
            return r.data;
        },
        onMutate: async (vars) => {
            await qc.cancelQueries({ queryKey: ['competitors', vars.project_id] });
            // Lo removemos de la UI inmediatamente
            updateCompetitorInCache(qc, vars.project_id, (list) => list.filter((c) => c.id !== vars.id));
        },
        onSettled: (_d, _e, vars) => {
            qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
        },
    });
}
export function useBulkApproveCompetitors() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ ids }) => {
            const r = await api.post('/competitors/bulk-approve', { ids });
            return r.data;
        },
        onMutate: async (vars) => {
            await qc.cancelQueries({ queryKey: ['competitors', vars.project_id] });
            const set = new Set(vars.ids);
            updateCompetitorInCache(qc, vars.project_id, (list) => list.map((c) => (set.has(c.id) ? { ...c, status: 'confirmed' } : c)));
        },
        onSettled: (_d, _e, vars) => {
            qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
        },
    });
}
export function useBulkRejectCompetitors() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ ids, project_id }) => {
            await Promise.all(ids.map((id) => api.patch(`/competitors/${id}/reject`, {})));
            return { updated: ids.length, project_id };
        },
        onMutate: async (vars) => {
            await qc.cancelQueries({ queryKey: ['competitors', vars.project_id] });
            const set = new Set(vars.ids);
            updateCompetitorInCache(qc, vars.project_id, (list) => list.filter((c) => !set.has(c.id)));
        },
        onSettled: (_d, _e, vars) => {
            qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
        },
    });
}
export function useCreateCompetitor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/competitors', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
        },
    });
}
export function useUpdateCompetitor() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, project_id: _pid, ...input }) => {
            const r = await api.patch(`/competitors/${id}`, input);
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
        mutationFn: async ({ id }) => {
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
        mutationFn: async ({ id, mode, networks, }) => {
            const r = await api.post(`/competitors/${id}/analyze`, mode || networks ? { mode, networks } : undefined);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['competitors', vars.project_id] });
            qc.invalidateQueries({ queryKey: ['competitor-stats', vars.id] });
            qc.invalidateQueries({ queryKey: ['competitor-posts', vars.id] });
        },
    });
}
export function useCompetitorStats(competitorId) {
    return useQuery({
        queryKey: ['competitor-stats', competitorId],
        queryFn: async () => {
            const r = await api.get(`/competitors/${competitorId}/stats`);
            return r.data;
        },
        enabled: !!competitorId,
    });
}
export function useCompetitorPosts(competitorId, filters) {
    return useQuery({
        queryKey: ['competitor-posts', competitorId, filters?.platform ?? null, filters?.limit ?? null],
        queryFn: async () => {
            const qs = new URLSearchParams();
            if (filters?.platform)
                qs.set('platform', filters.platform);
            if (filters?.limit)
                qs.set('limit', String(filters.limit));
            const suffix = qs.toString() ? `?${qs.toString()}` : '';
            const r = await api.get(`/competitors/${competitorId}/posts${suffix}`);
            return r.data;
        },
        enabled: !!competitorId,
    });
}
export function useCompetitorBenchmark(projectId) {
    return useQuery({
        queryKey: ['competitors-benchmark', projectId],
        queryFn: async () => {
            const r = await api.get(`/competitors/benchmark?project_id=${projectId}`);
            return r.data;
        },
        enabled: !!projectId,
    });
}
export function useCompetitorGaps(projectId) {
    return useQuery({
        queryKey: ['competitors-gaps', projectId],
        queryFn: async () => {
            const r = await api.get(`/competitors/gaps?project_id=${projectId}`);
            return r.data;
        },
        enabled: !!projectId,
    });
}
export function useScrapeInstagram() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai-services/scrape-instagram', input);
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
export function useScrapeTiktok() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai-services/scrape-tiktok', input);
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
