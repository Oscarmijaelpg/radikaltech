import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useProjectStats(projectId) {
    return useQuery({
        queryKey: ['stats', 'project', projectId ?? null],
        queryFn: async () => {
            const r = await api.get(`/stats?project_id=${projectId}`);
            return r.data;
        },
        enabled: !!projectId,
    });
}
export function useUserStats(enabled = true) {
    return useQuery({
        queryKey: ['stats', 'user'],
        queryFn: async () => {
            const r = await api.get('/stats/user');
            return r.data;
        },
        enabled,
    });
}
