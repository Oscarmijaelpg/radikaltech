import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import type { ActiveJob } from './types';

export function useActiveJobs(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['jobs', 'active', projectId],
    queryFn: async () => {
      const r = await api.get<{ data: ActiveJob[] }>(
        `/jobs/active?project_id=${projectId}`,
      );
      return r.data;
    },
    enabled: !!projectId,
    refetchInterval: (q) => {
      const data = q.state.data;
      return data && data.length > 0 ? 3000 : false;
    },
    structuralSharing: (oldData, newData) => {
      // Si pasamos de tener jobs activos a NO tener → invalidar caches de marca/contenido
      const oldCount = Array.isArray(oldData) ? (oldData as ActiveJob[]).length : 0;
      const newCount = Array.isArray(newData) ? (newData as ActiveJob[]).length : 0;
      if (oldCount > 0 && newCount === 0 && projectId) {
        queueMicrotask(() => {
          qc.invalidateQueries({ queryKey: ['memory', 'brand', projectId] });
          qc.invalidateQueries({ queryKey: ['content', 'list', projectId] });
          qc.invalidateQueries({ queryKey: ['projects'] });
          qc.invalidateQueries({ queryKey: ['competitors', projectId] });
        });
      }
      return newData;
    },
  });
}

// Variante para flujos donde aún no hay `activeProject` (p.ej. onboarding).
// Consulta todos los jobs activos del usuario y hace polling cada 3s mientras los haya.
// Además, durante los primeros `warmupMs` milisegundos polea aunque no haya jobs,
// para capturar jobs que se disparan fire-and-forget justo después de un submit.
export function useActiveJobsForUser(warmupMs = 20_000) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['jobs', 'active', 'user'],
    queryFn: async () => {
      const r = await api.get<{ data: ActiveJob[] }>(`/jobs/active`);
      return r.data;
    },
    enabled: !!session,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (data && data.length > 0) return 3000;
      const lastFetchedAt = q.state.dataUpdatedAt;
      if (lastFetchedAt && Date.now() - lastFetchedAt < warmupMs) return 2000;
      return false;
    },
  });
}
