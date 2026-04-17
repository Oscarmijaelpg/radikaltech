import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useAggregateNews() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars) => {
            const res = await api.post('/ai-services/aggregate-news', vars);
            return res.data;
        },
        onSuccess: (_data, vars) => {
            if (vars.project_id) {
                qc.invalidateQueries({ queryKey: ['reports', 'news', vars.project_id] });
            }
        },
    });
}
export function useSavedNewsReports(projectId) {
    return useQuery({
        queryKey: ['reports', 'news', projectId],
        enabled: !!projectId,
        queryFn: async () => {
            const res = await api.get(`/reports?project_id=${projectId}&type=news`);
            return res.data;
        },
    });
}
