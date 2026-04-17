import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useRecommendations(projectId, filters) {
    return useQuery({
        queryKey: ['recommendations', projectId, filters?.status ?? null, filters?.kind ?? null],
        enabled: !!projectId,
        queryFn: async () => {
            const qs = new URLSearchParams();
            qs.set('project_id', projectId);
            if (filters?.status)
                qs.set('status', filters.status);
            if (filters?.kind)
                qs.set('kind', filters.kind);
            const r = await api.get(`/recommendations?${qs.toString()}`);
            return r.data;
        },
    });
}
export function useRecommendation(id) {
    return useQuery({
        queryKey: ['recommendations', 'detail', id],
        enabled: !!id,
        queryFn: async () => {
            const r = await api.get(`/recommendations/${id}`);
            return r.data;
        },
    });
}
export function useUpdateRecommendationStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.patch(`/recommendations/${input.id}`, {
                status: input.status,
            });
            return r.data;
        },
        onMutate: async (input) => {
            await qc.cancelQueries({ queryKey: ['recommendations', input.project_id] });
            const prev = qc.getQueriesData({
                queryKey: ['recommendations', input.project_id],
            });
            qc.setQueriesData({ queryKey: ['recommendations', input.project_id] }, (old) => old?.map((r) => (r.id === input.id ? { ...r, status: input.status } : r)) ?? old);
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
        mutationFn: async (input) => {
            const r = await api.patch(`/recommendations/${input.id}`, {
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
        mutationFn: async (input) => {
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
        mutationFn: async (input) => {
            const r = await api.post('/recommendations/generate', input);
            return r.data;
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ['recommendations', v.project_id] });
        },
    });
}
