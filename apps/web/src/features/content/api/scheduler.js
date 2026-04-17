import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useScheduledPosts(projectId, filters = {}) {
    return useQuery({
        queryKey: ['scheduled-posts', 'list', projectId, filters],
        enabled: !!projectId,
        queryFn: async () => {
            const qs = new URLSearchParams();
            qs.set('project_id', projectId);
            if (filters.status)
                qs.set('status', filters.status);
            if (filters.from)
                qs.set('from', filters.from);
            if (filters.to)
                qs.set('to', filters.to);
            const r = await api.get(`/scheduled-posts?${qs.toString()}`);
            return r.data;
        },
    });
}
export function useUpcomingScheduledPosts(enabled = true, limit = 5) {
    return useQuery({
        queryKey: ['scheduled-posts', 'upcoming', limit],
        enabled,
        queryFn: async () => {
            const r = await api.get(`/scheduled-posts/upcoming?limit=${limit}`);
            return r.data;
        },
    });
}
export function useCreateScheduledPost() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/scheduled-posts', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
        },
    });
}
export function useUpdateScheduledPost() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, project_id: _pid, ...patch }) => {
            const r = await api.patch(`/scheduled-posts/${id}`, patch);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
        },
    });
}
export function useMoveScheduledPost() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, scheduled_at, }) => {
            const r = await api.patch(`/scheduled-posts/${id}`, {
                scheduled_at,
            });
            return r.data;
        },
        onMutate: async ({ id, project_id, scheduled_at }) => {
            await qc.cancelQueries({ queryKey: ['scheduled-posts', 'list', project_id] });
            const prev = qc.getQueriesData({
                queryKey: ['scheduled-posts', 'list', project_id],
            });
            qc.setQueriesData({ queryKey: ['scheduled-posts', 'list', project_id] }, (old) => old?.map((p) => (p.id === id ? { ...p, scheduled_at } : p)) ?? old);
            return { prev };
        },
        onError: (_e, _v, ctx) => {
            ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
        },
        onSettled: (_d, _e, vars) => {
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
        },
    });
}
export function useCancelScheduledPost() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            const r = await api.post(`/scheduled-posts/${id}/cancel`);
            return r.data;
        },
        onMutate: async ({ id, project_id }) => {
            await qc.cancelQueries({ queryKey: ['scheduled-posts', 'list', project_id] });
            const prev = qc.getQueriesData({
                queryKey: ['scheduled-posts', 'list', project_id],
            });
            qc.setQueriesData({ queryKey: ['scheduled-posts', 'list', project_id] }, (old) => old?.map((p) => (p.id === id ? { ...p, status: 'cancelled' } : p)) ?? old);
            return { prev };
        },
        onError: (_e, _v, ctx) => {
            ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
        },
        onSettled: (_d, _e, vars) => {
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
        },
    });
}
export function useDeleteScheduledPost() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            await api.delete(`/scheduled-posts/${id}`);
            return id;
        },
        onMutate: async ({ id, project_id }) => {
            await qc.cancelQueries({ queryKey: ['scheduled-posts', 'list', project_id] });
            const prev = qc.getQueriesData({
                queryKey: ['scheduled-posts', 'list', project_id],
            });
            qc.setQueriesData({ queryKey: ['scheduled-posts', 'list', project_id] }, (old) => old?.filter((p) => p.id !== id) ?? old);
            return { prev };
        },
        onError: (_e, _v, ctx) => {
            ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
        },
        onSettled: (_d, _e, vars) => {
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'list', vars.project_id] });
            qc.invalidateQueries({ queryKey: ['scheduled-posts', 'upcoming'] });
        },
    });
}
