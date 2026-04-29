import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ActivityDay {
  date: string;
  messages: number;
  content: number;
  reports: number;
}

export interface TopAgent {
  agent_id: string;
  chats_count: number;
}

export interface RecentActivityItem {
  type: 'chat' | 'content' | 'report' | 'competitor' | 'memory';
  title: string;
  at: string;
  link: string;
}

export interface ProjectStats {
  chats_count: number;
  messages_count: number;
  content_count: number;
  reports_count: number;
  competitors_count: number;
  memories_count: number;
  chats_last_30d: number;
  messages_last_30d: number;
  content_last_30d: number;
  activity_by_day: ActivityDay[];
  top_agents: TopAgent[];
  recent_activity: RecentActivityItem[];
}

export function useProjectStats(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['stats', 'project', projectId ?? null],
    queryFn: async () => {
      const r = await api.get<{ data: ProjectStats }>(`/stats?project_id=${projectId}`);
      return r.data;
    },
    enabled: !!projectId,
  });
}

export function useUserStats(enabled = true) {
  return useQuery({
    queryKey: ['stats', 'user'],
    queryFn: async () => {
      const r = await api.get<{ data: ProjectStats }>('/stats/user');
      return r.data;
    },
    enabled,
  });
}
