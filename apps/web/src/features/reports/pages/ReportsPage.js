import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Card, Skeleton } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { cn } from '@/shared/utils/cn';
import { useReports } from '../api/reports';
import { ReportReader } from '../components/ReportReader';
import { ReportGeneratorButton } from '../components/ReportGeneratorButton';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { ScheduledReportsSection } from '../components/ScheduledReportsSection';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
import { Breadcrumb } from '@/shared/ui/Breadcrumb';
import { AnalysisSubnav } from '@/shared/ui/AnalysisSubnav';
const FILTERS = [
    { value: 'all', label: 'Todos' },
    { value: 'competition', label: 'Competencia' },
    { value: 'news', label: 'Noticias' },
    { value: 'monthly_audit', label: 'Auditoría' },
    { value: 'brand_strategy', label: 'Estrategia' },
    { value: 'general', label: 'General' },
];
const TYPE_COLORS = {
    competition: 'bg-rose-500',
    news: 'bg-cyan-500',
    monthly_audit: 'bg-amber-500',
    brand_strategy: 'bg-violet-500',
    general: 'bg-slate-400',
};
function sortDesc(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
export function ReportsPage() {
    const { activeProject } = useProject();
    const [selectedId, setSelectedId] = useState(null);
    const [filter, setFilter] = useState('all');
    const reportsQ = useReports(activeProject?.id);
    const selectedReport = useMemo(() => (reportsQ.data ?? []).find((r) => r.id === selectedId) ?? null, [reportsQ.data, selectedId]);
    const filtered = useMemo(() => {
        const items = [...(reportsQ.data ?? [])].sort(sortDesc);
        if (filter === 'all')
            return items;
        return items.filter((r) => r.reportType === filter);
    }, [reportsQ.data, filter]);
    const handleCreated = (r) => {
        setSelectedId(r.id);
    };
    if (!activeProject) {
        return (_jsx("div", { className: "p-8", children: _jsx(Card, { className: "p-12 text-center", children: _jsx("p", { className: "text-sm text-slate-500", children: "Selecciona un proyecto para ver tus reportes." }) }) }));
    }
    return (_jsx("div", { className: "min-h-full bg-gradient-to-br from-violet-50/40 via-white to-pink-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950", children: _jsxs("div", { className: "p-4 sm:p-6 md:p-8 max-w-7xl mx-auto", children: [_jsx(AnalysisSubnav, {}), selectedReport && (_jsx("div", { className: "mb-3", children: _jsx(Breadcrumb, { items: [
                            { label: 'Reportes', onClick: () => setSelectedId(null) },
                            { label: selectedReport.title },
                        ] }) })), _jsx(FeatureHint, { id: "reports-first-v1", title: "Los reportes consolidan todo el an\u00E1lisis", description: "Genera documentos estrat\u00E9gicos de marca, competencia o noticias. Los puedes descargar y compartir.", children: _jsxs("header", { className: "mb-6 md:mb-8 relative rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 md:p-10 text-white shadow-2xl", children: [_jsx("div", { className: "absolute inset-0 overflow-hidden rounded-[28px] md:rounded-[32px] pointer-events-none", children: _jsx("div", { className: "absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3" }) }), _jsx("div", { className: "absolute top-4 right-4 z-20", children: _jsx(HelpButton, { title: "Reportes", description: "Consolida informaci\u00F3n estrat\u00E9gica sobre tu marca, competencia y noticias en documentos descargables.", tips: [
                                        'Filtra por tipo (competencia, noticias, auditoría, estrategia).',
                                        'Genera nuevos reportes con el botón del hero.',
                                        'Programa reportes recurrentes desde la sección Agendados.',
                                    ] }) }), _jsxs("div", { className: "relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest opacity-80 mb-2", children: "Inteligencia consolidada" }), _jsx("h1", { className: "text-3xl md:text-5xl font-display font-black tracking-tight", children: "Reportes estrat\u00E9gicos" }), _jsx("p", { className: "text-white/80 mt-3 text-base md:text-lg max-w-2xl", children: "Informes accionables sobre tu marca, tu competencia y tu industria." })] }), _jsx(ReportGeneratorButton, { projectId: activeProject.id, onCreated: handleCreated })] })] }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 md:gap-6 min-w-0", children: [_jsx("aside", { children: _jsxs(Card, { className: "p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-3rem)] overflow-y-auto", children: [_jsx("div", { className: "flex flex-wrap gap-1.5 mb-3", children: FILTERS.map((f) => (_jsx("button", { onClick: () => setFilter(f.value), className: cn('px-2.5 py-1.5 text-[11px] font-semibold rounded-full transition-colors min-h-[36px] sm:min-h-0 sm:py-1', filter === f.value
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'), children: f.label }, f.value))) }), reportsQ.isLoading ? (_jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-14 w-full" }), _jsx(Skeleton, { className: "h-14 w-full" })] })) : filtered.length === 0 ? (_jsxs("div", { className: "py-6 text-center", children: [_jsx("span", { className: "material-symbols-outlined text-[28px] text-slate-300", children: "description" }), _jsx("p", { className: "text-xs text-slate-400 mt-2", children: "A\u00FAn no hay reportes." }), _jsx("p", { className: "text-[11px] text-slate-400", children: "Genera uno con el bot\u00F3n de arriba." })] })) : (_jsx("ul", { className: "space-y-1", children: filtered.map((r) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSelectedId(r.id), className: cn('w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-2', selectedId === r.id
                                                    ? 'bg-violet-50 border border-violet-200'
                                                    : 'hover:bg-slate-50'), children: [_jsx("span", { className: cn('mt-1.5 w-2 h-2 rounded-full shrink-0', TYPE_COLORS[r.reportType]) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-sm font-semibold text-slate-900 truncate", children: r.title }), _jsx("p", { className: "text-[11px] text-slate-500", children: new Date(r.createdAt).toLocaleDateString('es', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                }) })] })] }) }, r.id))) }))] }) }), _jsxs("section", { children: [selectedId ? (_jsx(ReportReader, { reportId: selectedId, onDeleted: () => setSelectedId(null) })) : (_jsx(Card, { className: "p-6", children: _jsx(CharacterEmpty, { character: "kronos", title: "Elige o genera un reporte", message: "Consolido informaci\u00F3n estrat\u00E9gica sobre tu marca, competencia o industria. T\u00FA eliges, yo analizo." }) })), _jsx("div", { className: "mt-6", children: _jsx(ScheduledReportsSection, { projectId: activeProject.id }) })] })] })] }) }));
}
