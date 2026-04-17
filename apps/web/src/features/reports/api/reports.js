import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useReports(projectId, type) {
    return useQuery({
        queryKey: ['reports', projectId, type ?? null],
        enabled: !!projectId,
        queryFn: async () => {
            const qs = new URLSearchParams();
            qs.set('project_id', projectId);
            if (type)
                qs.set('type', type);
            const r = await api.get(`/reports?${qs.toString()}`);
            return r.data;
        },
    });
}
export function useReport(id) {
    return useQuery({
        queryKey: ['reports', 'detail', id],
        enabled: !!id,
        queryFn: async () => {
            const r = await api.get(`/reports/${id}`);
            return r.data;
        },
    });
}
export function useDeleteReport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            await api.delete(`/reports/${id}`);
            return id;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
        },
    });
}
export function useGenerateBrandStrategy() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/reports/generate/brand-strategy', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
        },
    });
}
export function useGenerateMonthlyAudit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/reports/generate/monthly-audit', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
        },
    });
}
export function useGenerateCompetition() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/reports/generate/competition', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
        },
    });
}
export function useGenerateUnified() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/reports/generate/unified', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
        },
    });
}
export function useAggregateNewsReport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai-services/aggregate-news', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['reports', vars.project_id] });
        },
    });
}
