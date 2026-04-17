import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@radikal/ui';
import { CountUp } from '@/shared/ui/CountUp';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { useProjectStats, useUserStats } from '../api/stats';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';
import { useTour, DASHBOARD_TOUR_STEPS, TOUR_STORAGE_KEY } from '@/shared/tour';
import { useUpcomingScheduledPosts } from '@/features/content/api/scheduler';
import { useRecommendations } from '@/features/recommendations/api/recommendations';
import { useCompetitors } from '@/features/memory/api/memory';
import { TrendingWidget } from '../components/TrendingWidget';
import { SetupWizard, WelcomeModal } from '@/shared/fte/FirstTimeExperience';
import { cn } from '@/shared/utils/cn';
const KPI_META = [
    { key: 'chats_count', label: 'Chats', icon: 'forum', color: 'from-pink-500 to-rose-500' },
    { key: 'messages_count', label: 'Mensajes', icon: 'chat', color: 'from-cyan-500 to-blue-500' },
    { key: 'content_count', label: 'Contenido', icon: 'photo_library', color: 'from-amber-500 to-orange-500' },
    { key: 'reports_count', label: 'Reportes', icon: 'analytics', color: 'from-emerald-500 to-teal-500' },
];
function useSmartActions(projectId) {
    const navigate = useNavigate();
    const competitorsQ = useCompetitors(projectId);
    const recsQ = useRecommendations(projectId);
    const upcomingQ = useUpcomingScheduledPosts(!!projectId, 5);
    const loading = competitorsQ.isLoading || recsQ.isLoading || upcomingQ.isLoading;
    const actions = useMemo(() => {
        if (!projectId)
            return [];
        const list = [];
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
        }
        else {
            const staleComps = competitors.filter((c) => {
                if (!c.last_analyzed_at)
                    return true;
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
        if (!profile?.onboarding_completed)
            return;
        let completed = null;
        try {
            completed = window.localStorage.getItem(TOUR_STORAGE_KEY);
        }
        catch {
            /* ignore */
        }
        if (completed)
            return;
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
        const IMPACT_RANK = { high: 0, medium: 1, low: 2 };
        const list = recsQ.data ?? [];
        return [...list]
            .sort((a, b) => (IMPACT_RANK[a.impact] ?? 9) - (IMPACT_RANK[b.impact] ?? 9))
            .slice(0, 3);
    }, [recsQ.data]);
    const stats = activeProject ? projectStats.data : userStats.data;
    const loading = activeProject ? projectStats.isLoading : userStats.isLoading;
    return (_jsxs("div", { className: "min-h-full overflow-x-hidden bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40", children: [_jsx(WelcomeModal, {}), _jsxs("div", { className: "p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8", children: [_jsxs("header", { className: "relative overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] p-4 sm:p-5 md:p-7 text-white shadow-xl", children: [_jsx("div", { className: "absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" }), _jsxs("div", { className: "relative z-10 flex items-center gap-3 sm:gap-4", children: [logo && (_jsx("div", { className: "h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl border border-white/40 overflow-hidden shrink-0 grid place-items-center shadow-lg", style: logoContainerStyle(logoBrightness), children: _jsx("img", { src: logo, alt: "Logo", className: "w-full h-full object-contain p-1" }) })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("h1", { className: "text-xl sm:text-2xl md:text-3xl font-display font-black tracking-tight", children: ["Hola, ", profile?.full_name?.split(' ')[0] ?? 'bienvenido'] }), _jsx("p", { className: "text-white/80 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base truncate", children: activeProject
                                                    ? `Trabajando en ${activeProject.company_name ?? activeProject.name}`
                                                    : 'Vista global de tu cuenta' })] }), _jsx("div", { className: "hidden md:flex items-center gap-4", children: KPI_META.slice(0, 4).map((m) => (_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-2xl font-black", children: loading ? '—' : _jsx(CountUp, { end: stats?.[m.key] ?? 0 }) }), _jsx("p", { className: "text-[10px] font-semibold opacity-70", children: m.label })] }, m.key))) })] })] }), _jsxs("section", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3 sm:mb-4", children: [_jsx("div", { className: "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 grid place-items-center text-white shadow-md", children: _jsx("span", { className: "material-symbols-outlined text-[16px] sm:text-[18px]", children: "today" }) }), _jsxs("div", { children: [_jsx("h2", { className: "font-display font-black text-lg sm:text-xl", children: "Qu\u00E9 hacer hoy" }), _jsx("p", { className: "text-[10px] sm:text-[11px] text-slate-400", children: "Acciones priorizadas seg\u00FAn tu proyecto" })] })] }), actionsLoading ? (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4", children: [1, 2, 3].map((i) => (_jsx("div", { className: "h-[120px] sm:h-[140px] rounded-2xl sm:rounded-3xl bg-slate-100 animate-pulse" }, i))) })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4", children: smartActions.map((a) => (_jsxs("button", { type: "button", onClick: a.action, className: cn('group relative text-left p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white shadow-lg bg-gradient-to-br overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] min-h-[110px] sm:min-h-[130px] flex flex-col', a.gradient), children: [_jsx("div", { className: "absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/15 blur-2xl pointer-events-none group-hover:bg-white/25 transition-colors" }), _jsxs("div", { className: "relative z-10 flex flex-col flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1.5 sm:mb-2", children: [_jsx("span", { className: "material-symbols-outlined text-[20px] sm:text-[22px]", children: a.icon }), a.tag && (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-white/25 text-[9px] font-black uppercase tracking-wider", children: a.tag }))] }), _jsx("p", { className: "text-sm sm:text-base font-black leading-tight", children: a.title }), _jsx("p", { className: "text-xs sm:text-sm text-white/80 mt-0.5 sm:mt-1 leading-snug line-clamp-2", children: a.description }), _jsxs("span", { className: "mt-auto inline-flex items-center gap-1 text-xs font-bold pt-2 opacity-80 group-hover:opacity-100", children: ["Ir", _jsx("span", { className: "material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-1", children: "arrow_forward" })] })] })] }, a.id))) }))] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6", children: [_jsx("div", { children: _jsx(SetupWizard, {}) }), _jsxs("div", { className: "space-y-4 sm:space-y-6", children: [activeProject && (_jsxs(Card, { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4", children: [_jsxs("div", { className: "flex items-center gap-2 sm:gap-3 min-w-0", children: [_jsx("div", { className: "w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 grid place-items-center text-white shadow-md shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[18px] sm:text-[20px]", children: "tips_and_updates" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "font-display font-black text-sm sm:text-base", children: "Sugerencias" }), _jsx("p", { className: "text-[10px] sm:text-xs text-slate-500 truncate", children: "Top 3 acciones recomendadas" })] })] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => navigate('/recommendations'), children: "Ver todas" })] }), recsQ.isLoading ? (_jsx("div", { className: "space-y-2", children: [...Array(3)].map((_, i) => (_jsx("div", { className: "h-16 rounded-2xl bg-slate-100 animate-pulse" }, i))) })) : topRecs.length === 0 ? (_jsx(CharacterEmpty, { character: "indexa", title: "Cuando haya actividad, ver\u00E1s ideas aqu\u00ED", message: "Usa la plataforma un rato y generar\u00E9 sugerencias personalizadas.", action: { label: 'Generar', onClick: () => navigate('/recommendations') } })) : (_jsx("ul", { className: "space-y-2", children: topRecs.map((rec) => {
                                                    const impactClass = rec.impact === 'high'
                                                        ? 'bg-rose-500'
                                                        : rec.impact === 'medium'
                                                            ? 'bg-amber-500'
                                                            : 'bg-slate-400';
                                                    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => navigate('/recommendations'), className: "w-full text-left p-3 rounded-2xl border border-slate-200 bg-white hover:border-[hsl(var(--color-primary)/0.4)] hover:shadow-sm transition-all flex items-start gap-3", children: [_jsx("span", { className: `shrink-0 mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${impactClass}`, children: rec.impact }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-bold text-slate-900 line-clamp-1", children: rec.title }), _jsx("p", { className: "text-xs text-slate-500 line-clamp-1", children: rec.why })] })] }) }, rec.id));
                                                }) }))] })), _jsxs(Card, { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 mb-3", children: [_jsx("h3", { className: "font-display font-black text-sm sm:text-base", children: "Pr\u00F3ximos agendados" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => navigate('/content?tab=scheduled'), children: "Ver todos" })] }), upcomingPosts.isLoading ? (_jsx("div", { className: "space-y-2", children: [...Array(3)].map((_, i) => (_jsx("div", { className: "h-12 rounded-xl bg-slate-100 animate-pulse" }, i))) })) : (upcomingPosts.data ?? []).length === 0 ? (_jsx("p", { className: "text-xs text-slate-400 text-center py-3", children: "Sin posts agendados" })) : (_jsx("ul", { className: "divide-y divide-slate-100", children: upcomingPosts.data.slice(0, 3).map((p) => {
                                                    const date = new Date(p.scheduled_at);
                                                    return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => navigate('/content?tab=scheduled'), className: "w-full text-left py-2 flex items-center gap-3 hover:bg-slate-50 px-2 rounded-lg transition-colors", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-white shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "schedule" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs font-semibold text-slate-800 truncate", children: p.caption?.slice(0, 60) || p.platforms.join(', ') || 'Post agendado' }), _jsx("p", { className: "text-[10px] text-slate-400", children: date.toLocaleString('es', {
                                                                                day: '2-digit',
                                                                                month: 'short',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                            }) })] })] }) }, p.id));
                                                }) }))] }), activeProject && _jsx(TrendingWidget, { projectId: activeProject.id })] })] }), _jsxs("div", { className: "md:hidden pt-1 sm:pt-2", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-wider opacity-40 mb-2 sm:mb-3", children: "Tus n\u00FAmeros" }), _jsx("div", { className: "grid grid-cols-2 gap-2 sm:gap-3", children: loading
                                    ? KPI_META.map((m) => (_jsx("div", { className: "h-16 sm:h-[72px] rounded-2xl bg-slate-100 animate-pulse" }, m.key)))
                                    : KPI_META.map((m) => (_jsx(Card, { className: "p-3 sm:p-4", children: _jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [_jsx("div", { className: `w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br ${m.color} grid place-items-center text-white shadow-sm shrink-0`, children: _jsx("span", { className: "material-symbols-outlined text-[14px] sm:text-[16px]", children: m.icon }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[9px] font-black uppercase tracking-wider opacity-50", children: m.label }), _jsx("p", { className: "font-bold text-lg sm:text-xl text-slate-900 leading-tight", children: _jsx(CountUp, { end: stats?.[m.key] ?? 0 }) })] })] }) }, m.key))) })] })] })] }));
}
