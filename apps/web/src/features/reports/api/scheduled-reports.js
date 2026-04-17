import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useScheduledReports(projectId) {
    return useQuery({
        queryKey: ['scheduled-reports', projectId],
        enabled: !!projectId,
        queryFn: async () => {
            const r = await api.get(`/scheduled-reports?project_id=${projectId}`);
            return r.data;
        },
    });
}
export function useCreateScheduledReport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/scheduled-reports', input);
            return r.data;
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ['scheduled-reports', v.project_id] });
        },
    });
}
export function useUpdateScheduledReport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.patch(`/scheduled-reports/${input.id}`, input.patch);
            return r.data;
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ['scheduled-reports', v.project_id] });
        },
    });
}
export function useDeleteScheduledReport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            await api.delete(`/scheduled-reports/${input.id}`);
            return input.id;
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ['scheduled-reports', v.project_id] });
        },
    });
}
export function useRunScheduledReportNow() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post(`/scheduled-reports/${input.id}/run-now`);
            return r.data;
        },
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: ['scheduled-reports', v.project_id] });
            qc.invalidateQueries({ queryKey: ['reports'] });
            qc.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
