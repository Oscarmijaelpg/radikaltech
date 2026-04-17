import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Notification {
  id: string;
  userId: string;
  projectId: string | null;
  kind: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: Notification[];
  unread_count: number;
}

export function useNotifications(unreadOnly?: boolean, limit?: number) {
  return useQuery({
    queryKey: ['notifications', { unreadOnly: !!unreadOnly, limit: limit ?? 30 }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (unreadOnly) qs.set('unread_only', 'true');
      if (limit) qs.set('limit', String(limit));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const r = await api.get<{ data: NotificationsResponse }>(`/notifications${suffix}`);
      return r.data;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await api.patch<{ data: Notification }>(`/notifications/${id}/read`);
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
      const r = await api.post<{ data: { updated: number } }>('/notifications/mark-all-read');
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
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
