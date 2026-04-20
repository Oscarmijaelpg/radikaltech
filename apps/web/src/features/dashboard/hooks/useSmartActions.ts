import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpcomingScheduledPosts } from '@/features/content/api/scheduler';
import { useRecommendations } from '@/features/recommendations/api/recommendations';
import { useCompetitors } from '@/features/memory/api/memory';

const STALE_COMPETITOR_DAYS = 7;
const DAY_MS = 1000 * 60 * 60 * 24;
const MAX_ACTIONS = 6;
const UPCOMING_POSTS_LIMIT = 5;

export interface SmartAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradient: string;
  priority: number;
  action: () => void;
  tag?: string;
}

export function useSmartActions(projectId: string | undefined): {
  actions: SmartAction[];
  loading: boolean;
} {
  const navigate = useNavigate();
  const competitorsQ = useCompetitors(projectId);
  const recsQ = useRecommendations(projectId);
  const upcomingQ = useUpcomingScheduledPosts(!!projectId, UPCOMING_POSTS_LIMIT);

  const loading = competitorsQ.isLoading || recsQ.isLoading || upcomingQ.isLoading;

  const actions = useMemo(() => {
    if (!projectId) return [];
    const list: SmartAction[] = [];

    const competitors = competitorsQ.data ?? [];
    const recs = recsQ.data ?? [];
    const upcoming = upcomingQ.data ?? [];

    const highRecs = recs.filter((r) => r.impact === 'high' && r.status === 'new');
    if (highRecs.length > 0) {
      list.push({
        id: 'high-recs',
        icon: 'priority_high',
        title: `${highRecs.length} sugerencia${highRecs.length > 1 ? 's' : ''} de alto impacto`,
        description: highRecs[0]?.title ?? '',
        gradient: 'from-rose-500 to-pink-600',
        priority: 0,
        tag: 'Urgente',
        action: () => navigate('/recommendations'),
      });
    }

    if (upcoming.length === 0) {
      list.push({
        id: 'no-scheduled',
        icon: 'event_busy',
        title: 'Sin posts agendados',
        description: 'Tu calendario está vacío. ¿Agendamos contenido para esta semana?',
        gradient: 'from-amber-500 to-orange-500',
        priority: 1,
        tag: 'Calendario',
        action: () => navigate('/chat?q=Ayúdame+a+planificar+contenido+para+esta+semana'),
      });
    }

    if (competitors.length === 0) {
      list.push({
        id: 'no-competitors',
        icon: 'groups',
        title: 'Agrega tu primer competidor',
        description: 'Necesitamos conocer a tu competencia para darte mejores insights.',
        gradient: 'from-cyan-500 to-blue-600',
        priority: 2,
        tag: 'Setup',
        action: () => navigate('/competitors'),
      });
    } else {
      const staleComps = competitors.filter((c) => {
        if (!c.last_analyzed_at) return true;
        const daysSince = (Date.now() - new Date(c.last_analyzed_at).getTime()) / DAY_MS;
        return daysSince > STALE_COMPETITOR_DAYS;
      });
      if (staleComps.length > 0) {
        list.push({
          id: 'stale-competitors',
          icon: 'update',
          title: `${staleComps.length} competidor${staleComps.length > 1 ? 'es' : ''} sin actualizar`,
          description: `${staleComps[0]?.name ?? 'Competidor'} no se ha analizado en más de ${STALE_COMPETITOR_DAYS} días.`,
          gradient: 'from-cyan-500 to-blue-600',
          priority: 3,
          tag: 'Competencia',
          action: () => navigate('/competitors'),
        });
      }
    }

    const newRecs = recs.filter((r) => r.status === 'new' && r.impact !== 'high');
    if (newRecs.length > 0 && highRecs.length === 0) {
      list.push({
        id: 'new-recs',
        icon: 'tips_and_updates',
        title: `${newRecs.length} sugerencia${newRecs.length > 1 ? 's' : ''} nueva${newRecs.length > 1 ? 's' : ''}`,
        description: newRecs[0]?.title ?? '',
        gradient: 'from-violet-500 to-purple-600',
        priority: 4,
        tag: 'Sugerencias',
        action: () => navigate('/recommendations'),
      });
    }

    list.push({
      id: 'quick-chat',
      icon: 'chat',
      title: 'Pregunta lo que quieras',
      description: 'Tus agentes IA analizan, crean, planifican y miden por ti.',
      gradient: 'from-pink-500 via-fuchsia-500 to-violet-600',
      priority: 5,
      action: () => navigate('/chat'),
    });

    list.push({
      id: 'gen-content',
      icon: 'palette',
      title: 'Genera contenido visual',
      description: 'Crea imágenes alineadas con tu marca al instante.',
      gradient: 'from-amber-500 to-rose-500',
      priority: 6,
      action: () => navigate('/content?tab=generate'),
    });

    list.push({
      id: 'gen-report',
      icon: 'hub',
      title: 'Reporte 360°',
      description: 'Análisis completo cruzando toda tu data.',
      gradient: 'from-emerald-500 to-teal-600',
      priority: 7,
      action: () => navigate('/reports'),
    });

    return list.sort((a, b) => a.priority - b.priority).slice(0, MAX_ACTIONS);
  }, [projectId, competitorsQ.data, recsQ.data, upcomingQ.data, navigate]);

  return { actions, loading };
}
