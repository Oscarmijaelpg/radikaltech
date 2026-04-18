import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Skeleton } from '@radikal/ui';
import { useCompetitorBenchmark, useCompetitorGaps, } from '../api/memory';
const POSITION_META = {
    leader: {
        label: 'Líder',
        classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: 'emoji_events',
    },
    strong: {
        label: 'Posición fuerte',
        classes: 'bg-violet-100 text-violet-700 border-violet-200',
        icon: 'trending_up',
    },
    developing: {
        label: 'En desarrollo',
        classes: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: 'auto_graph',
    },
    behind: {
        label: 'Por detrás',
        classes: 'bg-rose-100 text-rose-700 border-rose-200',
        icon: 'trending_down',
    },
};
function fmtNum(n) {
    if (!isFinite(n) || isNaN(n))
        return '0';
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(1)}K`;
    if (Number.isInteger(n))
        return n.toString();
    return n.toFixed(1);
}
function RatioArrow({ ratio }) {
    if (!isFinite(ratio))
        return null;
    const up = ratio >= 1;
    const color = up ? 'text-emerald-600' : 'text-rose-600';
    const arrow = up ? '↑' : '↓';
    const pct = Math.abs((ratio - 1) * 100);
    return (_jsxs("span", { className: `${color} text-xs font-semibold`, children: [arrow, " ", pct.toFixed(0), "%"] }));
}
function radarData(my, comp) {
    const normalize = (a, b) => {
        const max = Math.max(a, b, 1);
        return [Math.round((a / max) * 100), Math.round((b / max) * 100)];
    };
    const [eng_t, eng_c] = normalize(my.engagement_score, comp?.engagement_score ?? 0);
    const [freq_t, freq_c] = normalize(my.posts_per_week, comp?.posts_per_week ?? 0);
    const myFormats = Object.keys(my.format_mix).length;
    const compFormats = comp ? Object.keys(comp.format_mix).length : 0;
    const [var_t, var_c] = normalize(myFormats, compFormats);
    const [plat_t, plat_c] = normalize(my.platforms.length, comp?.platforms.length ?? 0);
    // Growth: posts count as proxy
    const [gr_t, gr_c] = normalize(my.social_posts_count, comp?.social_posts_count ?? 0);
    return [
        { dimension: 'Engagement', tu: eng_t, competidor: eng_c },
        { dimension: 'Frecuencia', tu: freq_t, competidor: freq_c },
        { dimension: 'Formatos', tu: var_t, competidor: var_c },
        { dimension: 'Multi-plataforma', tu: plat_t, competidor: plat_c },
        { dimension: 'Crecimiento', tu: gr_t, competidor: gr_c },
    ];
}
export function CompetitorsBenchmarkTab({ projectId }) {
    const { data: benchmark, isLoading } = useCompetitorBenchmark(projectId);
    const { data: gaps, isLoading: loadingGaps } = useCompetitorGaps(projectId);
    const navigate = useNavigate();
    const topComps = useMemo(() => benchmark?.competitors.slice(0, 5) ?? [], [benchmark]);
    const [selectedComp, setSelectedComp] = useState(null);
    const selected = useMemo(() => {
        if (!benchmark)
            return null;
        if (selectedComp)
            return benchmark.competitors.find((c) => c.id === selectedComp) ?? null;
        return benchmark.competitors[0] ?? null;
    }, [benchmark, selectedComp]);
    if (isLoading)
        return _jsx(Skeleton, { className: "h-96" });
    if (!benchmark) {
        return (_jsx(Card, { className: "p-6 text-center text-sm text-slate-500", children: "No hay datos suficientes para generar benchmark." }));
    }
    const pos = POSITION_META[benchmark.overall_position];
    const { my_brand } = benchmark;
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(Card, { className: "p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-200", children: _jsxs("div", { className: "flex items-start gap-3 sm:gap-4", children: [_jsx("span", { className: "material-symbols-outlined text-violet-600 text-[28px] sm:text-[36px] shrink-0", children: pos.icon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2 flex-wrap", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500", children: "Tu posici\u00F3n actual" }), _jsx(Badge, { className: `${pos.classes} border text-xs`, children: pos.label })] }), _jsx("p", { className: "text-sm text-slate-700 leading-relaxed break-words", children: benchmark.summary })] })] }) }), _jsxs("div", { children: [_jsxs("h3", { className: "font-display text-lg font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-violet-600", children: "table_chart" }), "Comparativa vs Top 5"] }), _jsx(Card, { className: "p-0 overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 border-b border-slate-200", children: _jsxs("tr", { className: "text-left text-[11px] uppercase tracking-wider text-slate-500", children: [_jsx("th", { className: "p-3 font-bold", children: "Marca" }), _jsx("th", { className: "p-3 font-bold text-right", children: "Posts" }), _jsx("th", { className: "p-3 font-bold text-right", children: "Likes prom" }), _jsx("th", { className: "p-3 font-bold text-right", children: "Comments prom" }), _jsx("th", { className: "p-3 font-bold text-right", children: "Frec (sem)" }), _jsx("th", { className: "p-3 font-bold", children: "Mejor plataforma" }), _jsx("th", { className: "p-3 font-bold", children: "Veredicto" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { className: "bg-violet-50 border-b border-violet-100", children: [_jsx("td", { className: "p-3 font-bold text-violet-900", children: _jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-violet-600" }), my_brand.name] }) }), _jsx("td", { className: "p-3 text-right font-semibold", children: fmtNum(my_brand.social_posts_count) }), _jsx("td", { className: "p-3 text-right", children: fmtNum(my_brand.avg_likes) }), _jsx("td", { className: "p-3 text-right", children: fmtNum(my_brand.avg_comments) }), _jsx("td", { className: "p-3 text-right", children: fmtNum(my_brand.posts_per_week) }), _jsx("td", { className: "p-3 text-xs text-slate-600", children: my_brand.best_performing_platform ?? '—' }), _jsx("td", { className: "p-3", children: "\u2014" })] }), topComps.map((c) => (_jsxs("tr", { className: "border-b border-slate-100 last:border-0", children: [_jsx("td", { className: "p-3 font-semibold text-slate-900 truncate max-w-[200px]", children: c.name }), _jsx("td", { className: "p-3 text-right", children: fmtNum(c.social_posts_count) }), _jsx("td", { className: "p-3 text-right", children: _jsx("div", { children: fmtNum(c.avg_likes) }) }), _jsx("td", { className: "p-3 text-right", children: fmtNum(c.avg_comments) }), _jsxs("td", { className: "p-3 text-right", children: [_jsx("div", { children: fmtNum(c.posts_per_week) }), _jsx(RatioArrow, { ratio: c.my_vs_them.frequency_ratio })] }), _jsx("td", { className: "p-3 text-xs text-slate-600", children: c.best_performing_platform ?? '—' }), _jsx("td", { className: "p-3", children: _jsx(Badge, { className: `border text-[10px] uppercase ${c.my_vs_them.verdict === 'ahead'
                                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                : c.my_vs_them.verdict === 'behind'
                                                                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                                    : 'bg-slate-100 text-slate-600 border-slate-200'}`, children: c.my_vs_them.verdict === 'ahead' ? 'ventaja' : c.my_vs_them.verdict === 'behind' ? 'atrás' : 'paridad' }) })] }, c.id))), topComps.length === 0 && (_jsx("tr", { children: _jsx("td", { className: "p-6 text-center text-slate-500 text-sm", colSpan: 7, children: "A\u00FAn no hay competidores analizados para comparar." }) }))] })] }) }) })] }), selected && (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-3 flex-wrap gap-2", children: [_jsxs("h3", { className: "font-display text-lg font-bold flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-violet-600", children: "radar" }), "Benchmark multidimensional"] }), _jsx("select", { className: "px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm", value: selected.id, onChange: (e) => setSelectedComp(e.target.value), children: benchmark.competitors.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id))) })] }), _jsx(Card, { className: "p-4", children: _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(RadarChart, { data: radarData(my_brand, selected), children: [_jsx(PolarGrid, {}), _jsx(PolarAngleAxis, { dataKey: "dimension", tick: { fontSize: 12 } }), _jsx(PolarRadiusAxis, { angle: 30, domain: [0, 100], tick: { fontSize: 10 } }), _jsx(Radar, { name: "Tu marca", dataKey: "tu", stroke: "hsl(280, 67%, 55%)", fill: "hsl(280, 67%, 55%)", fillOpacity: 0.45 }), _jsx(Radar, { name: selected.name, dataKey: "competidor", stroke: "hsl(14, 89%, 55%)", fill: "hsl(14, 89%, 55%)", fillOpacity: 0.3 }), _jsx(Tooltip, {})] }) }) })] })), _jsxs("div", { children: [_jsxs("h3", { className: "font-display text-lg font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-amber-600", children: "lightbulb" }), "Oportunidades detectadas"] }), loadingGaps ? (_jsx(Skeleton, { className: "h-40" })) : !gaps ||
                        (gaps.content_gaps.length === 0 &&
                            gaps.temporal_gaps.length === 0 &&
                            gaps.theme_gaps.length === 0) ? (_jsx(Card, { className: "p-6 text-center text-sm text-slate-500", children: "No se detectaron gaps significativos por ahora." })) : (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [gaps.content_gaps.slice(0, 4).map((g) => (_jsxs(Card, { className: "p-4 border-amber-200 bg-amber-50/40", children: [_jsxs("div", { className: "flex items-start gap-2 mb-2", children: [_jsx("span", { className: "material-symbols-outlined text-amber-600", children: "warning" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("h4", { className: "font-bold text-sm text-slate-900", children: ["Formato: ", _jsx("span", { className: "capitalize", children: g.format })] }), _jsxs("p", { className: "text-xs text-slate-600 mt-1", children: ["Usado por ", g.competitors_using.length, " competidor", g.competitors_using.length !== 1 ? 'es' : '', ". T\u00FA lo usas ", g.my_usage, " veces."] })] }), _jsxs(Badge, { className: "bg-amber-100 text-amber-700 border-amber-200 border text-[10px]", children: [g.opportunity_score, "/10"] })] }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => navigate('/recommendations'), className: "w-full", children: "Generar contenido para esto" })] }, `fmt-${g.format}`))), gaps.temporal_gaps.slice(0, 3).map((g) => (_jsxs(Card, { className: "p-4 border-amber-200 bg-amber-50/40", children: [_jsxs("div", { className: "flex items-start gap-2 mb-2", children: [_jsx("span", { className: "material-symbols-outlined text-amber-600", children: "calendar_today" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h4", { className: "font-bold text-sm text-slate-900 capitalize", children: g.weekday }), _jsxs("p", { className: "text-xs text-slate-600 mt-1", children: [g.competitors_active, " competidores activos este d\u00EDa y t\u00FA no publicas."] })] })] }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => navigate('/content'), className: "w-full", children: "Programar contenido" })] }, `day-${g.weekday}`))), gaps.theme_gaps.length > 0 && (_jsxs(Card, { className: "p-4 border-amber-200 bg-amber-50/40 sm:col-span-2", children: [_jsxs("div", { className: "flex items-start gap-2 mb-2", children: [_jsx("span", { className: "material-symbols-outlined text-amber-600", children: "topic" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h4", { className: "font-bold text-sm text-slate-900", children: "Temas sin explorar" }), _jsx("p", { className: "text-xs text-slate-600 mt-1", children: "Tus competidores hablan de estos temas y t\u00FA a\u00FAn no." })] })] }), _jsx("div", { className: "flex flex-wrap gap-1.5 mt-2 mb-3", children: gaps.theme_gaps.map((t) => (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-white border border-amber-200 text-[11px] font-semibold text-amber-800", children: t }, t))) }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => navigate('/recommendations'), children: "Generar contenido para esto" })] }))] }))] })] }));
}
