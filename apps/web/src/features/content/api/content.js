import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useAssets(projectId, filters = {}) {
    return useQuery({
        queryKey: ['content', 'list', projectId, filters],
        queryFn: async () => {
            const qs = new URLSearchParams();
            qs.set('project_id', projectId);
            if (filters.type)
                qs.set('type', filters.type);
            if (filters.sort)
                qs.set('sort', filters.sort);
            const r = await api.get(`/content?${qs.toString()}`);
            return r.data;
        },
        enabled: !!projectId,
    });
}
export function useAsset(id) {
    return useQuery({
        queryKey: ['content', 'detail', id],
        queryFn: async () => {
            const r = await api.get(`/content/${id}`);
            return r.data;
        },
        enabled: !!id,
    });
}
export function useCreateAsset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/content', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
        },
    });
}
export function useDeleteAsset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            await api.delete(`/content/${id}`);
            return id;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
        },
    });
}
export function useUpdateAsset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, project_id: _pid, ...patch }) => {
            const r = await api.patch(`/content/${id}`, patch);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
            qc.invalidateQueries({ queryKey: ['content', 'detail', vars.id] });
        },
    });
}
export function useEditImage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai-services/edit-image', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            if (vars.project_id) {
                qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
                qc.invalidateQueries({ queryKey: ['content-assets', 'image', vars.project_id] });
            }
        },
    });
}
export function useGenerateCaption() {
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai-services/generate-caption', input);
            return r.data;
        },
    });
}
export function useEvaluateAsset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            const r = await api.post(`/content/${id}/evaluate`);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['content', 'list', vars.project_id] });
            qc.invalidateQueries({ queryKey: ['content', 'detail', vars.id] });
        },
    });
}
