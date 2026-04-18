import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Tabs, TabsContent, TabsList, TabsTrigger, } from '@radikal/ui';
import { useCreateMemory, useCompetitorPosts, useCompetitorStats, } from '../api/memory';
import { CompetitionCharts } from './CompetitionCharts';
function fmtNumber(v) {
    if (v === null || v === undefined || Number.isNaN(v))
        return '—';
    if (v >= 1000)
        return v.toLocaleString('es-ES', { maximumFractionDigits: 0 });
    return v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}
function KpiCard({ icon, label, value }) {
    return (_jsx(Card, { className: "p-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "material-symbols-outlined text-[28px] text-[hsl(var(--color-primary))]", "aria-hidden": true, children: icon }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-400", children: label }), _jsx("p", { className: "text-xl font-bold text-slate-900 truncate", children: value })] })] }) }));
}
function PostCard({ post }) {
    const [showVisual, setShowVisual] = useState(false);
    const va = post.visual_analysis ?? null;
    return (_jsxs("div", { className: "group relative rounded-2xl border border-slate-200 overflow-hidden bg-white flex flex-col", children: [_jsxs("a", { href: post.post_url, target: "_blank", rel: "noopener noreferrer", className: "block relative aspect-square bg-slate-100", children: [post.image_url ? (_jsx("img", { src: post.image_url, alt: "", loading: "lazy", className: "w-full h-full object-cover group-hover:scale-105 transition-transform" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-slate-400 text-xs", children: "sin imagen" })), _jsx("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2", children: _jsx("span", { className: "opacity-0 group-hover:opacity-100 text-white text-[10px] uppercase tracking-widest font-black", children: "Abrir post" }) })] }), _jsxs("div", { className: "p-3 flex flex-col gap-2 flex-1", children: [_jsx("p", { className: "text-xs text-slate-700 line-clamp-2 min-h-[32px]", children: post.caption ?? '—' }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [_jsx(Badge, { variant: "secondary", children: post.platform }), _jsxs(Badge, { variant: "secondary", children: ["\u2665 ", fmtNumber(post.likes)] }), _jsxs(Badge, { variant: "secondary", children: ["\uD83D\uDCAC ", fmtNumber(post.comments)] })] }), va && (_jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: () => setShowVisual((v) => !v), className: "text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))] hover:underline", children: showVisual ? 'Ocultar' : 'Análisis visual' }), showVisual && (_jsxs("div", { className: "mt-2 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2", children: [va.description && _jsx("p", { className: "text-xs text-slate-700", children: va.description }), va.dominant_colors && va.dominant_colors.length > 0 && (_jsx("div", { className: "flex gap-1", children: va.dominant_colors.map((c, i) => (_jsx("span", { title: c, className: "w-5 h-5 rounded-md border border-slate-300", style: { backgroundColor: c } }, i))) })), va.style_tags && va.style_tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1", children: va.style_tags.map((t, i) => (_jsx(Badge, { variant: "outline", children: t }, i))) }))] }))] }))] })] }));
}
export function CompetitorAnalysisDialog({ open, onOpenChange, projectId, competitorId, competitorName, result, }) {
    const createMemory = useCreateMemory();
    const { data: posts } = useCompetitorPosts(competitorId ?? null, { limit: 30 });
    const { data: stats } = useCompetitorStats(competitorId ?? null);
    const engagement = stats?.engagement_stats ?? null;
    const aesthetic = useMemo(() => {
        const withVa = (posts ?? []).filter((p) => Boolean(p.visual_analysis));
        if (withVa.length === 0)
            return null;
        const colorCount = {};
        const tagCount = {};
        const descriptions = [];
        for (const p of withVa) {
            const va = p.visual_analysis;
            for (const c of va.dominant_colors ?? []) {
                const key = c.toUpperCase();
                colorCount[key] = (colorCount[key] ?? 0) + 1;
            }
            for (const t of va.style_tags ?? []) {
                const key = t.toLowerCase();
                tagCount[key] = (tagCount[key] ?? 0) + 1;
            }
            if (va.description)
                descriptions.push(va.description);
        }
        const topColors = Object.entries(colorCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([c]) => c);
        const topTags = Object.entries(tagCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([t, n]) => ({ tag: t, count: n }));
        return { topColors, topTags, descriptions: descriptions.slice(0, 5), total: withVa.length };
    }, [posts]);
    const save = async () => {
        if (!result)
            return;
        await createMemory.mutateAsync({
            project_id: projectId,
            category: 'competitor_analysis',
            key: `Análisis: ${competitorName}`,
            value: result.insights.join('\n') || `Análisis de ${competitorName}`,
            metadata: { analysis: result, competitor_name: competitorName },
        });
        onOpenChange(false);
    };
    const bestHourLabel = engagement?.best_hour !== null && engagement?.best_hour !== undefined
        ? `${String(engagement.best_hour).padStart(2, '0')}:00`
        : null;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-5xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["An\u00E1lisis de ", competitorName] }) }), _jsxs(Tabs, { defaultValue: "analysis", children: [_jsxs(TabsList, { className: "flex overflow-x-auto scrollbar-hide max-w-full flex-nowrap", children: [_jsx(TabsTrigger, { value: "analysis", className: "shrink-0", children: "An\u00E1lisis" }), _jsx(TabsTrigger, { value: "charts", disabled: !competitorId, className: "shrink-0", children: "Gr\u00E1ficos" }), _jsx(TabsTrigger, { value: "posts", disabled: !competitorId, className: "shrink-0", children: "\u00DAltimos posts" }), _jsx(TabsTrigger, { value: "aesthetic", disabled: !competitorId || !aesthetic, className: "shrink-0", children: "Est\u00E9tica visual" })] }), _jsx(TabsContent, { value: "analysis", children: !result ? (_jsx("p", { className: "text-sm text-slate-500", children: "A\u00FAn no hay an\u00E1lisis de mercado." })) : (_jsxs("div", { className: "space-y-6", children: [_jsxs("section", { children: [_jsx("h3", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2", children: "Consulta usada" }), _jsx("p", { className: "text-sm text-slate-700", children: result.query })] }), _jsxs("section", { children: [_jsx("h3", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3", children: "Competidores detectados por Sira" }), result.competitors.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500", children: "No se encontraron competidores." })) : (_jsx("div", { className: "space-y-3", children: result.competitors.map((c, i) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 p-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-1", children: [_jsx("h4", { className: "font-semibold text-slate-900", children: c.name }), c.url && (_jsx("a", { href: c.url, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-[hsl(var(--color-primary))] hover:underline truncate max-w-[40%]", children: c.url }))] }), c.summary && _jsx("p", { className: "text-sm text-slate-600 mb-3", children: c.summary }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [c.strengths && c.strengths.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1", children: "Fortalezas" }), _jsx("ul", { className: "text-xs text-slate-700 space-y-1 list-disc pl-4", children: c.strengths.map((s, j) => (_jsx("li", { children: s }, j))) })] })), c.weaknesses && c.weaknesses.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-red-500 mb-1", children: "Debilidades" }), _jsx("ul", { className: "text-xs text-slate-700 space-y-1 list-disc pl-4", children: c.weaknesses.map((s, j) => (_jsx("li", { children: s }, j))) })] }))] })] }, i))) }))] }), _jsxs("section", { children: [_jsx("h3", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2", children: "Insights estrat\u00E9gicos" }), result.insights.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500", children: "Sin insights." })) : (_jsx("ul", { className: "space-y-2", children: result.insights.map((ins, i) => (_jsxs("li", { className: "flex gap-2 text-sm text-slate-700", children: [_jsx(Badge, { variant: "primary", children: i + 1 }), _jsx("span", { className: "flex-1", children: ins })] }, i))) }))] })] })) }), _jsx(TabsContent, { value: "charts", children: competitorId && (_jsx("div", { className: "space-y-4", children: !engagement || engagement.total_posts === 0 ? (_jsx(NoSocialDataEmpty, { competitorName: competitorName })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3", children: [_jsx(KpiCard, { icon: "photo_library", label: "Total posts", value: fmtNumber(engagement.total_posts) }), _jsx(KpiCard, { icon: "bolt", label: "Engagement prom.", value: fmtNumber(engagement.avg_engagement) }), _jsx(KpiCard, { icon: "calendar_month", label: "Posts/semana", value: fmtNumber(engagement.posts_per_week) }), _jsx(KpiCard, { icon: "event_available", label: "Mejor d\u00EDa", value: engagement.best_day
                                                        ? `${engagement.best_day}${bestHourLabel ? ` · ${bestHourLabel}` : ''}`
                                                        : '—' })] }), _jsx(CompetitionCharts, { projectId: projectId, competitorIds: [competitorId] })] })) })) }), _jsx(TabsContent, { value: "posts", children: !posts || posts.length === 0 ? (_jsx(NoSocialDataEmpty, { competitorName: competitorName })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", children: posts.map((p) => (_jsx(PostCard, { post: p }, p.id))) })) }), _jsx(TabsContent, { value: "aesthetic", children: !aesthetic ? (_jsx("p", { className: "text-sm text-slate-500", children: "A\u00FAn no hay an\u00E1lisis visual. Ejecuta un scrape para generar est\u00E9tica visual autom\u00E1tica." })) : (_jsxs("div", { className: "space-y-6", children: [_jsxs("section", { children: [_jsxs("h3", { className: "text-sm font-semibold text-slate-900 mb-2", children: ["La est\u00E9tica de ", competitorName] }), _jsxs("p", { className: "text-xs text-slate-500 mb-3", children: ["Basado en ", aesthetic.total, " posts analizados autom\u00E1ticamente."] }), aesthetic.descriptions.length > 0 && (_jsx("ul", { className: "space-y-2", children: aesthetic.descriptions.map((d, i) => (_jsx("li", { className: "text-sm text-slate-700 border-l-2 border-slate-200 pl-3", children: d }, i))) }))] }), _jsxs("section", { children: [_jsx("h3", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2", children: "Colores dominantes" }), _jsx("div", { className: "flex flex-wrap gap-2", children: aesthetic.topColors.map((c, i) => (_jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx("span", { className: "w-12 h-12 rounded-xl border border-slate-300", style: { backgroundColor: c }, title: c }), _jsx("span", { className: "text-[10px] font-mono text-slate-500", children: c })] }, i))) })] }), _jsxs("section", { children: [_jsx("h3", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2", children: "Style tags frecuentes" }), _jsx("div", { className: "flex flex-wrap gap-2", children: aesthetic.topTags.map(({ tag, count }, i) => (_jsxs(Badge, { variant: "secondary", children: [tag, " \u00B7 ", count] }, i))) })] })] })) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cerrar" }), result && (_jsxs(Button, { onClick: save, disabled: createMemory.isPending, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "bookmark_add" }), "Guardar en Memoria"] }))] })] }) }));
}
function NoSocialDataEmpty({ competitorName }) {
    return (_jsxs("div", { className: "p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-center", children: [_jsx("span", { className: "material-symbols-outlined text-[40px] text-slate-400 mb-3 block", children: "query_stats" }), _jsxs("h4", { className: "font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-1", children: ["A\u00FAn no hay datos sociales de ", competitorName] }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4", children: "Para ver gr\u00E1ficos, posts y est\u00E9tica necesitamos scrapear su Instagram o TikTok. Intenta:" }), _jsxs("ul", { className: "text-sm text-left text-slate-600 dark:text-slate-300 max-w-md mx-auto space-y-1.5 list-disc pl-5", children: [_jsx("li", { children: "Edita el competidor y a\u00F1ade el URL de su Instagram o TikTok manualmente." }), _jsx("li", { children: "O ejecuta el an\u00E1lisis de nuevo \u2014 intentaremos descubrir sus redes autom\u00E1ticamente desde su sitio web." })] })] }));
}
