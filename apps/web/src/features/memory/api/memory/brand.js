import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useBrandHistory(projectId) {
    return useQuery({
        queryKey: ['memory', 'brand', 'history', projectId],
        enabled: !!projectId,
        queryFn: async () => {
            const r = await api.get(`/brand/history?project_id=${projectId}`);
            return r.data;
        },
    });
}
export function useBrand(projectId) {
    return useQuery({
        queryKey: ['memory', 'brand', projectId],
        queryFn: async () => {
            const r = await api.get(`/memory/brand/${projectId}`);
            return r.data;
        },
        enabled: !!projectId,
    });
}
export function useUpsertBrand() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.put('/brand', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['memory', 'brand', vars.project_id] });
        },
    });
}
export function useAnalyzeBrand() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai-services/analyze-brand', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            // El job real corre en background. Forzamos refresh del polling de jobs activos
            // para que el banner aparezca de inmediato.
            qc.invalidateQueries({ queryKey: ['jobs', 'active', vars.project_id] });
        },
    });
}
export function useAcceptBrandSuggestion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/brand/accept-suggestion', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['memory', 'brand', vars.project_id] });
        },
    });
}
export function useSynthesizeBrand() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai/synthesize-brand', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['memory', 'brand', vars.project_id] });
        },
    });
}
