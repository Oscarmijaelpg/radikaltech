import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FIRST_DAY_TASKS, levelForPoints, type Level } from './tasks';

export interface OnboardingProgress {
  has_brand: boolean;
  has_business_summary: boolean;
  has_logo: boolean;
  competitors_count: number;
  chats_count: number;
  generated_images_count: number;
  reports_count: number;
  recommendations_count: number;
  scheduled_posts_count: number;
  total_points: number;
  level: { label: string; emoji: string };
  completed_tasks: string[];
  next_task_id: string | null;
}

export interface FirstTimeProgress {
  loading: boolean;
  progress: OnboardingProgress | null;
  completedIds: Set<string>;
  totalTasks: number;
  completedTasks: number;
  totalPoints: number;
  level: Level;
  nextTaskId: string | null;
  allCompleted: boolean;
}

export function useFirstTimeProgress(projectId: string | null | undefined): FirstTimeProgress {
  const q = useQuery({
    queryKey: ['fte', 'progress', projectId ?? null],
    queryFn: async () => {
      const r = await api.get<{ data: OnboardingProgress }>(
        `/stats/onboarding-progress?project_id=${projectId}`,
      );
      return r.data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const progress = q.data ?? null;
  const completedIds = new Set(progress?.completed_tasks ?? []);
  const totalTasks = FIRST_DAY_TASKS.length;
  const completedTasks = completedIds.size;
  const totalPoints = progress?.total_points ?? 0;
  const level = levelForPoints(totalPoints);
  const nextTaskId =
    progress?.next_task_id ?? FIRST_DAY_TASKS.find((t) => !completedIds.has(t.id))?.id ?? null;

  return {
    loading: q.isLoading,
    progress,
    completedIds,
    totalTasks,
    completedTasks,
    totalPoints,
    level,
    nextTaskId,
    allCompleted: completedTasks === totalTasks && totalTasks > 0,
  };
}
