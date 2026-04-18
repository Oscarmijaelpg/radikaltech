import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Icon,
} from '@radikal/ui';
import { CountUp } from '@/shared/ui/CountUp';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { useProjectStats, useUserStats, type ProjectStats } from '../api/stats';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';
import { useTour, DASHBOARD_TOUR_STEPS, TOUR_STORAGE_KEY } from '@/shared/tour';
import { useUpcomingScheduledPosts } from '@/features/content/api/scheduler';
import { useRecommendations } from '@/features/recommendations/api/recommendations';
import { useCompetitors } from '@/features/memory/api/memory';
import { TrendingWidget } from '../components/TrendingWidget';
import { SetupWizard, WelcomeModal } from '@/shared/fte/FirstTimeExperience';
import { cn } from '@/shared/utils/cn';

const KPI_META: Array<{
  key: keyof Pick<ProjectStats, 'chats_count' | 'messages_count' | 'content_count' | 'reports_count'>;
  label: string;
  icon: string;
  color: string;
}> = [
  { key: 'chats_count', label: 'Chats', icon: 'forum', color: 'from-pink-500 to-rose-500' },
  { key: 'messages_count', label: 'Mensajes', icon: 'chat', color: 'from-cyan-500 to-blue-500' },
  { key: 'content_count', label: 'Contenido', icon: 'photo_library', color: 'from-amber-500 to-orange-500' },
  { key: 'reports_count', label: 'Reportes', icon: 'analytics', color: 'from-emerald-500 to-teal-500' },
];

interface SmartAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradient: string;
  priority: number;
  action: () => void;
  tag?: string;
}

function useSmartActions(projectId: string | undefined): { actions: SmartAction[]; loading: boolean } {
  const navigate = useNavigate();
  const competitorsQ = useCompetitors(projectId);
  const recsQ = useRecommendations(projectId);
  const upcomingQ = useUpcomingScheduledPosts(!!projectId, 5);

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
        action: () => navigate('/memory?tab=competitors'),
      });
    } else {
      const staleComps = competitors.filter((c) => {
        if (!c.last_analyzed_at) return true;
        const daysSince = (Date.now() - new Date(c.last_analyzed_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 7;
      });
      if (staleComps.length > 0) {
        list.push({
          id: 'stale-competitors',
          icon: 'update',
          title: `${staleComps.length} competidor${staleComps.length > 1 ? 'es' : ''} sin actualizar`,
          description: `${staleComps[0]?.name ?? 'Competidor'} no se ha analizado en más de 7 días.`,
          gradient: 'from-cyan-500 to-blue-600',
          priority: 3,
          tag: 'Competencia',
          action: () => navigate('/memory?tab=competitors'),
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

    return list.sort((a, b) => a.priority - b.priority).slice(0, 6);
  }, [projectId, competitorsQ.data, recsQ.data, upcomingQ.data, navigate]);

  return { actions, loading };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeProject } = useProject();
  const { url: logo, brightness: logoBrightness } = useProjectLogoWithBrightness(activeProject?.id);
  const { startTour } = useTour();

  useEffect(() => {
    if (!profile?.onboarding_completed) return;
    let completed: string | null = null;
    try {
      completed = window.localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (completed) return;
    const t = window.setTimeout(() => {
      startTour(DASHBOARD_TOUR_STEPS);
    }, 600);
    return () => window.clearTimeout(t);
  }, [profile?.onboarding_completed, startTour]);

  const projectStats = useProjectStats(activeProject?.id ?? null);
  const userStats = useUserStats(!activeProject);
  const upcomingPosts = useUpcomingScheduledPosts(true, 5);
  const recsQ = useRecommendations(activeProject?.id, { status: 'new' });
  const { actions: smartActions, loading: actionsLoading } = useSmartActions(activeProject?.id);
  const topRecs = useMemo(() => {
    const IMPACT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const list = recsQ.data ?? [];
    return [...list]
      .sort((a, b) => (IMPACT_RANK[a.impact] ?? 9) - (IMPACT_RANK[b.impact] ?? 9))
      .slice(0, 3);
  }, [recsQ.data]);
  const stats = activeProject ? projectStats.data : userStats.data;
  const loading = activeProject ? projectStats.isLoading : userStats.isLoading;

  return (
    <div className="min-h-full overflow-x-hidden bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40">
      <WelcomeModal />
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Hero compacto */}
        <header className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] p-4 sm:p-5 md:p-7 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3 sm:gap-4">
            {logo && (
              <div
                className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl border border-white/40 overflow-hidden shrink-0 grid place-items-center shadow-lg"
                style={logoContainerStyle(logoBrightness)}
              >
                <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black tracking-tight">
                Hola, {profile?.full_name?.split(' ')[0] ?? 'bienvenido'}
              </h1>
              <p className="text-white/80 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base truncate">
                {activeProject
                  ? `Trabajando en ${activeProject.company_name ?? activeProject.name}`
                  : 'Vista global de tu cuenta'}
              </p>
            </div>
            {/* KPIs mini en el hero */}
            <div className="hidden md:flex items-center gap-4">
              {KPI_META.slice(0, 4).map((m) => (
                <div key={m.key} className="text-center">
                  <p className="text-2xl font-black">
                    {loading ? '—' : <CountUp end={stats?.[m.key] ?? 0} />}
                  </p>
                  <p className="text-[10px] font-semibold opacity-70">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Qué hacer hoy */}
        <section>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 grid place-items-center text-white shadow-md">
              <Icon name="today" className="text-[16px] sm:text-[18px]" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg sm:text-xl">Qué hacer hoy</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Acciones priorizadas según tu proyecto</p>
            </div>
          </div>
          {actionsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[120px] sm:h-[140px] rounded-2xl sm:rounded-3xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {smartActions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={a.action}
                  className={cn(
                    'group relative text-left p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white shadow-lg bg-gradient-to-br overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] min-h-[110px] sm:min-h-[130px] flex flex-col',
                    a.gradient,
                  )}
                >
                  <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/15 blur-2xl pointer-events-none group-hover:bg-white/25 transition-colors" />
                  <div className="relative z-10 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                      <Icon name={a.icon} className="text-[20px] sm:text-[22px]" />
                      {a.tag && (
                        <span className="px-2 py-0.5 rounded-full bg-white/25 text-[9px] font-black uppercase tracking-wider">
                          {a.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-black leading-tight">{a.title}</p>
                    <p className="text-xs sm:text-sm text-white/80 mt-0.5 sm:mt-1 leading-snug line-clamp-2">{a.description}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold pt-2 opacity-80 group-hover:opacity-100">
                      Ir
                      <Icon name="arrow_forward" className="text-[14px] transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 2-col: Primer día + Sugerencias/Agendados/Trending */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <SetupWizard />
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Sugerencias de hoy */}
            {activeProject && (
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 grid place-items-center text-white shadow-md shrink-0">
                      <Icon name="tips_and_updates" className="text-[18px] sm:text-[20px]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-black text-sm sm:text-base">Sugerencias</h3>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">Top 3 acciones recomendadas</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/recommendations')}>
                    Ver todas
                  </Button>
                </div>
                {recsQ.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : topRecs.length === 0 ? (
                  <CharacterEmpty
                    character="indexa"
                    title="Cuando haya actividad, verás ideas aquí"
                    message="Usa la plataforma un rato y generaré sugerencias personalizadas."
                    action={{ label: 'Generar', onClick: () => navigate('/recommendations') }}
                  />
                ) : (
                  <ul className="space-y-2">
                    {topRecs.map((rec) => {
                      const impactClass =
                        rec.impact === 'high'
                          ? 'bg-rose-500'
                          : rec.impact === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-slate-400';
                      return (
                        <li key={rec.id}>
                          <button
                            type="button"
                            onClick={() => navigate('/recommendations')}
                            className="w-full text-left p-3 rounded-2xl border border-slate-200 bg-white hover:border-[hsl(var(--color-primary)/0.4)] hover:shadow-sm transition-all flex items-start gap-3"
                          >
                            <span
                              className={`shrink-0 mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${impactClass}`}
                            >
                              {rec.impact}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 line-clamp-1">{rec.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-1">{rec.why}</p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            )}

            {/* Próximos agendados */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display font-black text-sm sm:text-base">Próximos agendados</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/content?tab=scheduled')}>
                  Ver todos
                </Button>
              </div>
              {upcomingPosts.isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : (upcomingPosts.data ?? []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">Sin posts agendados</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {upcomingPosts.data!.slice(0, 3).map((p) => {
                    const date = new Date(p.scheduled_at);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => navigate('/content?tab=scheduled')}
                          className="w-full text-left py-2 flex items-center gap-3 hover:bg-slate-50 px-2 rounded-lg transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-white shrink-0">
                            <Icon name="schedule" className="text-[16px]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {p.caption?.slice(0, 60) || p.platforms.join(', ') || 'Post agendado'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {date.toLocaleString('es', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {activeProject && <TrendingWidget projectId={activeProject.id} />}
          </div>
        </div>

        {/* KPIs mobile */}
        <div className="md:hidden pt-1 sm:pt-2">
          <p className="text-[10px] font-black uppercase tracking-wider opacity-40 mb-2 sm:mb-3">
            Tus números
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {loading
              ? KPI_META.map((m) => (
                  <div key={m.key} className="h-16 sm:h-[72px] rounded-2xl bg-slate-100 animate-pulse" />
                ))
              : KPI_META.map((m) => (
                  <Card key={m.key} className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br ${m.color} grid place-items-center text-white shadow-sm shrink-0`}
                      >
                        <Icon name={m.icon} className="text-[14px] sm:text-[16px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-50">{m.label}</p>
                        <p className="font-bold text-lg sm:text-xl text-slate-900 leading-tight">
                          <CountUp end={stats?.[m.key] ?? 0} />
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
