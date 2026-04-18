import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useMemories(projectId, category) {
    return useQuery({
        queryKey: ['memory', 'list', projectId, category ?? null],
        queryFn: async () => {
            const qs = new URLSearchParams();
            qs.set('project_id', projectId);
            if (category)
                qs.set('category', category);
            const r = await api.get(`/memory?${qs.toString()}`);
            return r.data;
        },
        enabled: !!projectId,
    });
}
export function useCreateMemory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/memory', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['memory', 'list', vars.project_id] });
        },
    });
}
export function useUpdateMemory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...input }) => {
            const r = await api.patch(`/memory/${id}`, input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['memory', 'list', vars.project_id] });
        },
    });
}
export function useDeleteMemory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            await api.delete(`/memory/${id}`);
            return id;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['memory', 'list', vars.project_id] });
        },
    });
}
