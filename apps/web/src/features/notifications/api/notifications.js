import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useNotifications(unreadOnly, limit) {
    return useQuery({
        queryKey: ['notifications', { unreadOnly: !!unreadOnly, limit: limit ?? 30 }],
        queryFn: async () => {
            const qs = new URLSearchParams();
            if (unreadOnly)
                qs.set('unread_only', 'true');
            if (limit)
                qs.set('limit', String(limit));
            const suffix = qs.toString() ? `?${qs.toString()}` : '';
            const r = await api.get(`/notifications${suffix}`);
            return r.data;
        },
        refetchInterval: 60_000,
    });
}
export function useMarkNotificationRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const r = await api.patch(`/notifications/${id}/read`);
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
export function useMarkAllNotificationsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const r = await api.post('/notifications/mark-all-read');
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
export function useDeleteNotification() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            await api.delete(`/notifications/${id}`);
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
