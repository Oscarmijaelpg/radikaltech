import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useSocialAccounts(projectId) {
    return useQuery({
        queryKey: ['social-accounts', projectId],
        queryFn: async () => {
            const r = await api.get(`/social-accounts?project_id=${projectId}`);
            return r.data;
        },
        enabled: !!projectId,
    });
}
export function useCreateSocialAccount() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/social-accounts', input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['social-accounts', vars.project_id] });
        },
    });
}
export function useUpdateSocialAccount() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, project_id: _pid, ...input }) => {
            const r = await api.patch(`/social-accounts/${id}`, input);
            return r.data;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['social-accounts', vars.project_id] });
        },
    });
}
export function useDeleteSocialAccount() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            await api.delete(`/social-accounts/${id}`);
            return id;
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ['social-accounts', vars.project_id] });
        },
    });
}
