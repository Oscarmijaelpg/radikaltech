import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useDetectMarkets(projectId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const r = await api.post(`/projects/${projectId}/detect-markets`, {});
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}
export function useUpdateMarkets(projectId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (countries) => {
            const r = await api.patch(`/projects/${projectId}/markets`, { countries });
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}
export function useConfirmMarkets(projectId) {
    return useUpdateMarkets(projectId);
}
