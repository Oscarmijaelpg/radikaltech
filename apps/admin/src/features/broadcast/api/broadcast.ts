import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BroadcastPayload {
  title: string;
  body?: string;
  actionUrl?: string;
  kind?: string;
  segment: 'all' | 'onboarded' | 'not_onboarded' | 'user_ids';
  userIds?: string[];
  preview?: boolean;
}

export interface BroadcastResult {
  preview?: boolean;
  created?: number;
  recipientCount: number;
}

export function useBroadcast() {
  return useMutation({
    mutationFn: (payload: BroadcastPayload) =>
      api.post<{ data: BroadcastResult }>('/admin/broadcast/notifications', payload).then((r) => r.data),
  });
}
