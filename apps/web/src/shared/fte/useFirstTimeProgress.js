import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FIRST_DAY_TASKS, levelForPoints } from './tasks';
export function useFirstTimeProgress(projectId) {
    const q = useQuery({
        queryKey: ['fte', 'progress', projectId ?? null],
        queryFn: async () => {
            const r = await api.get(`/stats/onboarding-progress?project_id=${projectId}`);
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
    const nextTaskId = progress?.next_task_id ?? FIRST_DAY_TASKS.find((t) => !completedIds.has(t.id))?.id ?? null;
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
