import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useUpdateProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...input }) => {
            const r = await api.patch(`/projects/${id}`, input);
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}
