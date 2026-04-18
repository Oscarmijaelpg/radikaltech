import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, } from 'recharts';
import { useQueries } from '@tanstack/react-query';
import { Card, Spinner } from '@radikal/ui';
import { api } from '@/lib/api';
import { useCompetitors } from '../api/memory';
const COLORS = [
    'hsl(327, 100%, 51%)',
    'hsl(182, 53%, 50%)',
    'hsl(217, 91%, 60%)',
    'hsl(142, 70%, 45%)',
    'hsl(25, 100%, 50%)',
    'hsl(280, 67%, 55%)',
    'hsl(45, 100%, 50%)',
];
function colorFor(_name, idx) {
    return COLORS[idx % COLORS.length] ?? '#888';
}
export function CompetitionCharts({ projectId, competitorIds }) {
    const { data: competitors } = useCompetitors(projectId);
    const statsQueries = useQueries({
        queries: competitorIds.map((id) => ({
            queryKey: ['competitor-stats', id],
            queryFn: async () => {
                const r = await api.get(`/competitors/${id}/stats`);
                return r.data;
            },
            enabled: !!id,
        })),
    });
    const postsQueries = useQueries({
        queries: competitorIds.map((id) => ({
            queryKey: ['competitor-posts', id, null, 30],
            queryFn: async () => {
                const r = await api.get(`/competitors/${id}/posts?limit=30`);
                return r.data;
            },
            enabled: !!id,
        })),
    });
    const loadingStats = statsQueries.some((q) => q.isLoading);
    const loadingPosts = postsQueries.some((q) => q.isLoading);
    const stats = statsQueries
        .map((q) => q.data)
        .filter((d) => !!d);
    const postsById = {};
    competitorIds.forEach((id, i) => {
        postsById[id] = postsQueries[i]?.data ?? [];
    });
    const nameById = useMemo(() => {
        const m = {};
        (competitors ?? []).forEach((c) => {
            m[c.id] = c.name;
        });
        return m;
    }, [competitors]);
    const engagementData = useMemo(() => stats.map((s, i) => ({
        name: nameById[s.competitor_id] ?? s.competitor_name,
        avgEngagement: Math.round(s.avg_engagement),
        fill: colorFor(s.competitor_name, i),
    })), [stats, nameById]);
    const volumeData = useMemo(() => {
        const cutoff = Date.now() - 28 * 86_400_000;
        return competitorIds.map((id, i) => {
            const posts = postsById[id] ?? [];
            const count = posts.filter((p) => {
                if (!p.posted_at)
                    return false;
                return new Date(p.posted_at).getTime() >= cutoff;
            }).length;
            return {
                name: nameById[id] ?? 'Competidor',
                count,
                fill: colorFor(nameById[id] ?? '', i),
            };
        });
    }, [competitorIds, postsById, nameById]);
    const formatMixData = useMemo(() => {
        const agg = {};
        stats.forEach((s) => {
            Object.entries(s.format_mix ?? {}).forEach(([k, v]) => {
                const key = k || 'unknown';
                agg[key] = (agg[key] ?? 0) + v;
            });
        });
        return Object.entries(agg).map(([name, value]) => ({ name, value }));
    }, [stats]);
    const scatterData = useMemo(() => {
        return competitorIds.flatMap((id, i) => {
            const color = colorFor(nameById[id] ?? '', i);
            return (postsById[id] ?? []).map((p) => ({
                x: p.likes,
                y: p.comments,
                z: p.views || 50,
                postUrl: p.post_url,
                caption: p.caption,
                competitor: nameById[id] ?? 'Competidor',
                fill: color,
            }));
        });
    }, [competitorIds, postsById, nameById]);
    if (loadingStats || loadingPosts) {
        return (_jsx(Card, { className: "p-8 flex items-center justify-center", children: _jsx(Spinner, {}) }));
    }
    if (competitorIds.length === 0 || stats.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-5", children: [_jsxs(Card, { className: "p-5", children: [_jsx("h3", { className: "text-sm font-bold text-slate-900 mb-1", children: "Engagement promedio por post" }), _jsx("p", { className: "text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-4", children: "Likes + comentarios x3 + shares x5 / posts" }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(BarChart, { data: engagementData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f1f5f9" }), _jsx(XAxis, { dataKey: "name", tick: { fontSize: 11 } }), _jsx(YAxis, { tick: { fontSize: 11 } }), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "avgEngagement", radius: [6, 6, 0, 0], children: engagementData.map((d, i) => (_jsx(Cell, { fill: d.fill }, i))) })] }) })] }), _jsxs(Card, { className: "p-5", children: [_jsx("h3", { className: "text-sm font-bold text-slate-900 mb-1", children: "Volumen total \u00FAltimas 4 semanas" }), _jsx("p", { className: "text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-4", children: "Posts publicados" }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(BarChart, { data: volumeData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f1f5f9" }), _jsx(XAxis, { dataKey: "name", tick: { fontSize: 11 } }), _jsx(YAxis, { tick: { fontSize: 11 } }), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "count", radius: [6, 6, 0, 0], children: volumeData.map((d, i) => (_jsx(Cell, { fill: d.fill }, i))) })] }) })] }), _jsxs(Card, { className: "p-5", children: [_jsx("h3", { className: "text-sm font-bold text-slate-900 mb-1", children: "Mezcla de formatos" }), _jsx("p", { className: "text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-4", children: "Video / imagen / carousel" }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: formatMixData, dataKey: "value", nameKey: "name", outerRadius: 100, label: true, children: formatMixData.map((_, i) => (_jsx(Cell, { fill: colorFor('fmt', i) }, i))) }), _jsx(Tooltip, {}), _jsx(Legend, {})] }) })] }), _jsxs(Card, { className: "p-5", children: [_jsx("h3", { className: "text-sm font-bold text-slate-900 mb-1", children: "Posts individuales" }), _jsx("p", { className: "text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-4", children: "Likes vs. comentarios \u2014 click para abrir" }), _jsx(ResponsiveContainer, { width: "100%", height: 280, children: _jsxs(ScatterChart, { children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f1f5f9" }), _jsx(XAxis, { type: "number", dataKey: "x", name: "likes", tick: { fontSize: 11 } }), _jsx(YAxis, { type: "number", dataKey: "y", name: "comments", tick: { fontSize: 11 } }), _jsx(Tooltip, { cursor: { strokeDasharray: '3 3' }, content: ({ active, payload }) => {
                                        if (!active || !payload || !payload.length)
                                            return null;
                                        const p = payload[0]?.payload;
                                        if (!p)
                                            return null;
                                        return (_jsxs("div", { className: "bg-white p-3 border border-slate-200 rounded-xl shadow-xl max-w-xs", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-400", children: p.competitor }), p.caption && (_jsx("p", { className: "text-xs text-slate-700 mt-1 line-clamp-3", children: p.caption })), _jsxs("p", { className: "text-[11px] text-slate-500 mt-2", children: [_jsx("strong", { children: p.x }), " likes \u00B7 ", _jsx("strong", { children: p.y }), " comentarios"] })] }));
                                    } }), _jsx(Scatter, { data: scatterData, onClick: (d) => {
                                        if (d?.postUrl)
                                            window.open(d.postUrl, '_blank');
                                    }, children: scatterData.map((d, i) => (_jsx(Cell, { fill: d.fill, fillOpacity: 0.75 }, i))) })] }) })] })] }));
}
