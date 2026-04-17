import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { Badge, Button, Card, Skeleton, Spinner, Tooltip as UITooltip, TooltipContent, TooltipTrigger, } from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useReport, useDeleteReport } from '../api/reports';
import { useProject } from '@/providers/ProjectProvider';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';
function ReportLogo({ projectId }) {
    const { activeProject } = useProject();
    const isActive = !!(activeProject && activeProject.id === projectId);
    const { url: logo, brightness } = useProjectLogoWithBrightness(isActive ? projectId : null);
    if (!logo)
        return null;
    return (_jsx("div", { className: "w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-slate-200 overflow-hidden grid place-items-center shrink-0", style: logoContainerStyle(brightness), children: _jsx("img", { src: logo, alt: "Logo", className: "w-full h-full object-contain p-1" }) }));
}
const TYPE_LABELS = {
    competition: {
        label: 'Competencia',
        classes: 'bg-rose-100 text-rose-700 border-rose-200',
        icon: 'radar',
    },
    monthly_audit: {
        label: 'Auditoría',
        classes: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: 'fact_check',
    },
    brand_strategy: {
        label: 'Estrategia',
        classes: 'bg-violet-100 text-violet-700 border-violet-200',
        icon: 'auto_awesome',
    },
    news: {
        label: 'Noticias',
        classes: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        icon: 'newspaper',
    },
    general: {
        label: 'General',
        classes: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: 'description',
    },
};
function sentimentClasses(s) {
    const v = (s ?? '').toLowerCase();
    if (v === 'positive' || v === 'positivo')
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (v === 'negative' || v === 'negativo')
        return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
}
function impactClasses(i) {
    const v = (i ?? '').toLowerCase();
    if (v === 'high' || v === 'alto')
        return 'bg-red-100 text-red-700 border-red-200';
    if (v === 'medium' || v === 'medio')
        return 'bg-amber-100 text-amber-700 border-amber-200';
    if (v === 'low' || v === 'bajo')
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
}
function parseInsights(items) {
    return items.map((raw) => {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && ('text' in parsed || 'impact' in parsed)) {
                return parsed;
            }
        }
        catch {
            /* noop */
        }
        return { text: raw };
    });
}
function safeArray(v) {
    return Array.isArray(v) ? v : [];
}
/** Detecta si un string es JSON parseable (objeto o array) */
function tryParseJson(s) {
    if (!s)
        return null;
    const trimmed = s.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('['))
        return null;
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return null;
    }
}
function fmtDate(s) {
    if (!s)
        return '';
    try {
        return new Date(s).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    catch {
        return '';
    }
}
export function ReportReader({ reportId, onDeleted }) {
    const confirmDialog = useConfirm();
    const { data: report, isLoading } = useReport(reportId);
    const del = useDeleteReport();
    const containerRef = useRef(null);
    const [exporting, setExporting] = useState(false);
    const sourceData = (report?.sourceData ?? {});
    const citations = safeArray(sourceData.citations);
    // Extraer items de noticias (puede venir en sourceData como array, como objeto {items, analysis}, o en content JSON)
    const newsItems = useMemo(() => {
        if (report?.reportType !== 'news')
            return [];
        const sd = report.sourceData;
        if (Array.isArray(sd))
            return sd;
        if (sd && typeof sd === 'object' && 'items' in sd && Array.isArray(sd.items)) {
            return sd.items;
        }
        const parsed = tryParseJson(report.content);
        if (Array.isArray(parsed))
            return parsed;
        return [];
    }, [report?.reportType, report?.sourceData, report?.content]);
    const newsAnalysis = useMemo(() => {
        if (report?.reportType !== 'news')
            return null;
        const sd = report.sourceData;
        if (sd && typeof sd === 'object' && !Array.isArray(sd) && 'analysis' in sd) {
            const a = sd.analysis;
            if (a && typeof a === 'object')
                return a;
        }
        return null;
    }, [report?.reportType, report?.sourceData]);
    // Extraer competidores si el reporte de competencia trae JSON
    const competitorBlocks = useMemo(() => {
        if (report?.reportType !== 'competition')
            return [];
        const parsed = tryParseJson(report.content);
        if (parsed && typeof parsed === 'object' && 'competitors' in parsed) {
            const c = parsed.competitors;
            return Array.isArray(c) ? c : [];
        }
        if (Array.isArray(parsed))
            return parsed;
        return [];
    }, [report?.reportType, report?.content]);
    const insights = useMemo(() => parseInsights(report?.keyInsights ?? []), [report?.keyInsights]);
    // Decide si renderizar `content` como markdown:
    // - News con newsItems → NO (ya está renderizado como cards)
    // - Competition con competitorBlocks → NO
    // - Si el content es JSON puro y no tenemos vista especial → mostrar como pre formateado
    // - Otherwise → markdown
    const contentMode = useMemo(() => {
        if (!report?.content)
            return 'skip';
        if (report.reportType === 'news' && newsItems.length > 0)
            return 'skip';
        if (report.reportType === 'competition' && competitorBlocks.length > 0)
            return 'skip';
        const parsed = tryParseJson(report.content);
        if (parsed !== null)
            return 'json';
        return 'markdown';
    }, [report?.content, report?.reportType, newsItems.length, competitorBlocks.length]);
    const exportPdf = async () => {
        if (!containerRef.current || !report)
            return;
        setExporting(true);
        try {
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'),
                import('html2canvas'),
            ]);
            const canvas = await html2canvas(containerRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 40;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 20;
            pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
            heightLeft -= pageHeight - 20;
            while (heightLeft > 0) {
                position = 20 - (imgHeight - heightLeft);
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            const filename = `${report.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
            pdf.save(filename);
        }
        finally {
            setExporting(false);
        }
    };
    const exportDocx = () => {
        if (!report)
            return;
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${report.title}</title></head><body>${containerRef.current?.innerHTML ?? ''}</body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    const onDelete = async () => {
        if (!report)
            return;
        const ok = await confirmDialog({ title: '¿Eliminar este reporte?', variant: 'danger', confirmLabel: 'Eliminar' });
        if (!ok)
            return;
        await del.mutateAsync({ id: report.id, project_id: report.projectId });
        onDeleted?.();
    };
    if (isLoading || !report) {
        return _jsx(Skeleton, { className: "h-96" });
    }
    const typeMeta = TYPE_LABELS[report.reportType] ?? TYPE_LABELS.general;
    const createdAt = new Date(report.createdAt);
    return (_jsxs("div", { className: "space-y-4 min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 justify-start sm:justify-end", children: [_jsxs(UITooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", onClick: () => void exportPdf(), disabled: exporting, children: [exporting ? (_jsx(Spinner, { className: "h-4 w-4 mr-1" })) : (_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "picture_as_pdf" })), "Descargar PDF"] }) }), _jsx(TooltipContent, { side: "bottom", className: "max-w-[240px]", children: "Exporta este reporte como PDF para compartir" })] }), _jsxs(Button, { variant: "outline", onClick: exportDocx, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "description" }), "Descargar DOCX"] }), _jsxs(Button, { variant: "ghost", onClick: () => void onDelete(), className: "text-red-600 hover:bg-red-50", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "delete" }), "Eliminar"] })] }), _jsx(Card, { className: "p-4 sm:p-6 md:p-8 overflow-hidden", children: _jsxs("div", { ref: containerRef, className: "max-w-none min-w-0 overflow-hidden", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 mb-3", children: [_jsxs(Badge, { className: `${typeMeta.classes} border inline-flex items-center gap-1`, children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: typeMeta.icon }), typeMeta.label] }), _jsx("span", { className: "text-xs text-slate-500", children: createdAt.toLocaleDateString('es', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    }) })] }), _jsxs("div", { className: "flex items-start gap-4 mb-6", children: [_jsx(ReportLogo, { projectId: report.projectId }), _jsx("h1", { className: "font-display text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex-1 min-w-0 break-words", children: report.title })] }), report.summary && (_jsx("div", { className: "mb-6 rounded-2xl border-l-4 border-violet-400 bg-violet-50/50 p-4", children: _jsx("p", { className: "text-base text-slate-700 italic leading-relaxed break-words", children: report.summary }) })), insights.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsxs("h2", { className: "font-display text-xl font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-violet-600 text-[22px]", children: "lightbulb" }), "Insights clave"] }), _jsx("ol", { className: "space-y-2", children: insights.map((ins, idx) => (_jsxs("li", { className: "flex items-start gap-3 p-3 rounded-xl bg-violet-50/40 border border-violet-100", children: [_jsx("span", { className: "shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white grid place-items-center text-xs font-bold", children: idx + 1 }), _jsx("span", { className: "flex-1 text-sm text-slate-800 break-words leading-relaxed", children: ins.text ?? '' }), ins.impact && (_jsx(Badge, { className: `${impactClasses(ins.impact)} border text-[10px] uppercase shrink-0`, children: ins.impact }))] }, idx))) })] })), report.reportType === 'news' && newsItems.length > 0 && (_jsx(NewsRichBlock, { items: newsItems, analysis: newsAnalysis })), report.reportType === 'competition' && competitorBlocks.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsxs("h2", { className: "font-display text-xl font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-rose-600 text-[22px]", children: "radar" }), "Competidores analizados"] }), _jsx("div", { className: "space-y-3", children: competitorBlocks.map((c, idx) => (_jsxs("div", { className: "p-4 rounded-2xl border border-slate-200 bg-white min-w-0", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 mb-2 flex-wrap", children: [_jsx("h3", { className: "font-bold text-base text-slate-900 break-words", children: c.name ?? `Competidor ${idx + 1}` }), c.url && (_jsx("a", { href: c.url, target: "_blank", rel: "noreferrer noopener", className: "text-xs font-semibold text-rose-600 hover:underline break-all", children: c.url.replace(/^https?:\/\//, '').replace(/\/$/, '') }))] }), c.summary && (_jsx("p", { className: "text-sm text-slate-700 mb-3 break-words leading-relaxed", children: c.summary })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [c.strengths && c.strengths.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1.5", children: "Fortalezas" }), _jsx("ul", { className: "space-y-1", children: c.strengths.map((s, i) => (_jsxs("li", { className: "text-xs text-slate-700 flex items-start gap-1.5 break-words", children: [_jsx("span", { className: "text-emerald-600 mt-0.5", children: "+" }), _jsx("span", { className: "flex-1", children: s })] }, i))) })] })), c.weaknesses && c.weaknesses.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-red-700 mb-1.5", children: "Debilidades" }), _jsx("ul", { className: "space-y-1", children: c.weaknesses.map((w, i) => (_jsxs("li", { className: "text-xs text-slate-700 flex items-start gap-1.5 break-words", children: [_jsx("span", { className: "text-red-600 mt-0.5", children: "\u2212" }), _jsx("span", { className: "flex-1", children: w })] }, i))) })] }))] })] }, idx))) })] })), contentMode === 'markdown' && report.content && (_jsx("div", { className: "prose prose-slate prose-sm md:prose-base max-w-none break-words [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: report.content }) })), contentMode === 'json' && report.content && (_jsxs("details", { className: "mt-4", children: [_jsx("summary", { className: "text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700", children: "Ver datos crudos del reporte (JSON)" }), _jsx("pre", { className: "mt-2 text-[11px] bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-all", children: JSON.stringify(tryParseJson(report.content), null, 2) })] })), citations.length > 0 && (_jsxs("div", { className: "mt-8 pt-6 border-t border-slate-200", children: [_jsxs("h2", { className: "font-display text-lg font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-slate-500 text-[20px]", children: "link" }), "Fuentes"] }), _jsx("ul", { className: "space-y-1.5", children: citations.map((c, idx) => (_jsxs("li", { className: "text-sm flex items-start gap-2 break-words", children: [_jsxs("span", { className: "text-slate-400 shrink-0", children: ["[", idx + 1, "]"] }), c.url ? (_jsx("a", { href: c.url, target: "_blank", rel: "noreferrer noopener", className: "text-violet-700 hover:underline break-all flex-1 min-w-0", children: c.title ?? c.url })) : (_jsx("span", { className: "flex-1 min-w-0", children: c.title ?? '—' }))] }, c.id ?? idx))) })] }))] }) })] }));
}
const SENTIMENT_COLORS = {
    positive: '#10b981',
    neutral: '#94a3b8',
    negative: '#ef4444',
};
function sentimentLabel(s) {
    const v = (s ?? '').toLowerCase();
    if (v === 'positive' || v === 'positivo')
        return 'Positivo';
    if (v === 'negative' || v === 'negativo')
        return 'Negativo';
    if (v === 'neutral')
        return 'Neutral';
    return s ?? '—';
}
function relevanceClasses(score) {
    if (score >= 80)
        return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 50)
        return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
}
function authorityStars(authority) {
    return Math.max(1, Math.min(5, Math.round(authority / 20)));
}
function NewsRichBlock({ items, analysis, }) {
    const enriched = analysis?.items_enriched ?? null;
    const [onlyHighImpact, setOnlyHighImpact] = useState(false);
    const [onlyTrusted, setOnlyTrusted] = useState(false);
    // Agrupar por fuente (top 8)
    const sourcesData = useMemo(() => {
        const counts = new Map();
        items.forEach((it) => {
            const src = it.source ?? 'desconocido';
            counts.set(src, (counts.get(src) ?? 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, value]) => ({ name, value }));
    }, [items]);
    const uniqueSources = useMemo(() => new Set(items.map((it) => it.source ?? '').filter(Boolean)).size, [items]);
    const sentimentData = useMemo(() => {
        const sb = analysis?.sentiment_breakdown ?? { positive: 0, neutral: 0, negative: 0 };
        return [
            { name: 'Positivo', value: Number(sb.positive ?? 0), key: 'positive' },
            { name: 'Neutral', value: Number(sb.neutral ?? 0), key: 'neutral' },
            { name: 'Negativo', value: Number(sb.negative ?? 0), key: 'negative' },
        ].filter((d) => d.value > 0);
    }, [analysis]);
    const themes = analysis?.top_themes ?? [];
    const keywords = analysis?.trending_keywords ?? [];
    const perItem = analysis?.per_item_sentiment ?? {};
    const topTheme = themes[0];
    // High impact items (relevance >= 80)
    const highImpactCount = useMemo(() => (enriched ?? []).filter((e) => e.relevance_score >= 80).length, [enriched]);
    // Timeline: posts per day in last 21 days
    const timelineData = useMemo(() => {
        const map = new Map();
        const now = new Date();
        for (let i = 20; i >= 0; i -= 1) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            map.set(key, 0);
        }
        for (const it of items) {
            if (!it.published_at)
                continue;
            try {
                const k = new Date(it.published_at).toISOString().slice(0, 10);
                if (map.has(k))
                    map.set(k, (map.get(k) ?? 0) + 1);
            }
            catch {
                /* noop */
            }
        }
        return Array.from(map.entries()).map(([date, count]) => ({
            date: date.slice(5),
            count,
        }));
    }, [items]);
    // Build enriched view: group by cluster_id. For each cluster show item with highest authority.
    const enrichedView = useMemo(() => {
        if (!enriched || enriched.length === 0)
            return null;
        const byCluster = new Map();
        const standalone = [];
        for (const e of enriched) {
            if (e.cluster_id && (e.cluster_size ?? 1) > 1) {
                const arr = byCluster.get(e.cluster_id) ?? [];
                arr.push(e);
                byCluster.set(e.cluster_id, arr);
            }
            else {
                standalone.push(e);
            }
        }
        const groups = [];
        for (const arr of byCluster.values()) {
            const sorted = [...arr].sort((a, b) => b.source_authority - a.source_authority);
            groups.push({ lead: sorted[0], others: sorted.slice(1) });
        }
        for (const e of standalone)
            groups.push({ lead: e, others: [] });
        // filters
        const filtered = groups.filter(({ lead }) => {
            if (onlyHighImpact && lead.relevance_score < 80)
                return false;
            if (onlyTrusted && lead.source_authority < 70)
                return false;
            return true;
        });
        // sort by relevance desc, then authority
        filtered.sort((a, b) => b.lead.relevance_score - a.lead.relevance_score ||
            b.lead.source_authority - a.lead.source_authority);
        return filtered;
    }, [enriched, onlyHighImpact, onlyTrusted]);
    const hasTimeline = timelineData.some((d) => d.count > 0);
    return (_jsxs("div", { className: "mb-6", children: [highImpactCount > 0 && (_jsxs("div", { className: "mb-4 rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3", children: [_jsx("span", { className: "material-symbols-outlined text-red-600 text-[22px]", children: "warning" }), _jsxs("p", { className: "text-sm text-red-900 font-semibold", children: [highImpactCount, " noticia", highImpactCount !== 1 ? 's' : '', " de alto impacto para tu marca (relevancia \u2265 80)."] })] })), hasTimeline && (_jsxs("div", { className: "mb-6 p-4 rounded-2xl border border-slate-200 bg-white", children: [_jsxs("h4", { className: "text-sm font-bold text-slate-800 mb-2 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-cyan-600 text-[18px]", children: "timeline" }), "Noticias por d\u00EDa (\u00FAltimos 21 d\u00EDas)"] }), _jsx(ResponsiveContainer, { width: "100%", height: 140, children: _jsxs(BarChart, { data: timelineData, margin: { left: 0, right: 8, top: 4, bottom: 4 }, children: [_jsx(XAxis, { dataKey: "date", tick: { fontSize: 10 }, interval: 2 }), _jsx(YAxis, { allowDecimals: false, tick: { fontSize: 10 }, width: 24 }), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "count", fill: "#06b6d4", radius: [3, 3, 0, 0] })] }) })] })), analysis?.executive_summary && (_jsx(Card, { className: "p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 mb-6", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "material-symbols-outlined text-cyan-600 text-[24px] mt-1", children: "insights" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-display font-bold text-lg mb-2", children: "Resumen ejecutivo" }), _jsx("p", { className: "text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap", children: analysis.executive_summary })] })] }) })), analysis && (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6", children: [_jsxs("div", { className: "p-4 rounded-2xl border border-slate-200 bg-white", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1", children: "Noticias" }), _jsx("p", { className: "font-display text-2xl font-black text-slate-900", children: items.length })] }), _jsxs("div", { className: "p-4 rounded-2xl border border-slate-200 bg-white", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1", children: "Sentiment" }), _jsx(Badge, { className: `${sentimentClasses(analysis.overall_sentiment)} border text-xs`, children: sentimentLabel(analysis.overall_sentiment) })] }), _jsxs("div", { className: "p-4 rounded-2xl border border-slate-200 bg-white", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1", children: "Fuentes" }), _jsx("p", { className: "font-display text-2xl font-black text-slate-900", children: uniqueSources })] }), _jsxs("div", { className: "p-4 rounded-2xl border border-slate-200 bg-white min-w-0", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1", children: "Tema #1" }), _jsx("p", { className: "text-sm font-bold text-slate-900 break-words line-clamp-2", children: topTheme?.name ?? '—' })] })] })), (sentimentData.length > 0 || sourcesData.length > 0) && (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6", children: [sentimentData.length > 0 && (_jsxs("div", { className: "p-4 rounded-2xl border border-slate-200 bg-white", children: [_jsx("h4", { className: "text-sm font-bold text-slate-800 mb-2", children: "Distribuci\u00F3n de sentiment" }), _jsx(ResponsiveContainer, { width: "100%", height: 220, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: sentimentData, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", outerRadius: 80, label: true, children: sentimentData.map((entry) => (_jsx(Cell, { fill: SENTIMENT_COLORS[entry.key] ?? '#94a3b8' }, entry.key))) }), _jsx(Tooltip, {})] }) })] })), sourcesData.length > 0 && (_jsxs("div", { className: "p-4 rounded-2xl border border-slate-200 bg-white", children: [_jsx("h4", { className: "text-sm font-bold text-slate-800 mb-2", children: "Noticias por fuente" }), _jsx(ResponsiveContainer, { width: "100%", height: 220, children: _jsxs(BarChart, { data: sourcesData, layout: "vertical", margin: { left: 10, right: 10 }, children: [_jsx(XAxis, { type: "number", allowDecimals: false, tick: { fontSize: 11 } }), _jsx(YAxis, { type: "category", dataKey: "name", width: 110, tick: { fontSize: 11 } }), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "value", fill: "#06b6d4", radius: [0, 4, 4, 0] })] }) })] }))] })), themes.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsxs("h3", { className: "font-display font-bold text-lg mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-cyan-600", children: "category" }), "Temas principales"] }), _jsx("div", { className: "space-y-2", children: themes.map((t, idx) => (_jsxs("div", { className: "p-3 rounded-xl border border-slate-200 bg-white", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-1 flex-wrap", children: [_jsx("h4", { className: "font-semibold text-sm break-words", children: t.name }), _jsxs(Badge, { className: "bg-cyan-100 text-cyan-700 border-cyan-200 border text-[11px]", children: [t.count, " noticias"] })] }), t.description && (_jsx("p", { className: "text-xs text-slate-600 break-words", children: t.description }))] }, `${t.name}-${idx}`))) })] })), keywords.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsxs("h3", { className: "font-display font-bold text-lg mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-cyan-600", children: "trending_up" }), "Palabras clave"] }), _jsx("div", { className: "flex flex-wrap gap-2", children: keywords.map((kw, idx) => (_jsx("span", { className: "px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-800", children: kw }, `${kw}-${idx}`))) })] })), analysis?.narrative && (_jsxs("div", { className: "mb-8", children: [_jsxs("h3", { className: "font-display text-xl font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-cyan-600 text-[22px]", children: "article" }), "An\u00E1lisis completo"] }), _jsx("div", { className: "prose prose-slate prose-sm md:prose-base max-w-none text-slate-800 leading-relaxed break-words", children: _jsx(NarrativeWithCitations, { narrative: analysis.narrative, items: items }) })] })), enrichedView && (_jsxs("div", { className: "mb-3 flex flex-wrap gap-2 items-center", children: [_jsxs("label", { className: "inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 bg-white", children: [_jsx("input", { type: "checkbox", className: "accent-red-600", checked: onlyHighImpact, onChange: (e) => setOnlyHighImpact(e.target.checked) }), "Solo alto impacto"] }), _jsxs("label", { className: "inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 bg-white", children: [_jsx("input", { type: "checkbox", className: "accent-cyan-600", checked: onlyTrusted, onChange: (e) => setOnlyTrusted(e.target.checked) }), "Solo fuentes confiables (>70)"] })] })), enrichedView ? (_jsxs("div", { children: [_jsxs("h3", { className: "font-display text-xl font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-cyan-600 text-[22px]", children: "format_list_numbered" }), "Fuentes (", enrichedView.length, ")"] }), _jsx("ol", { className: "space-y-2 list-none pl-0", children: enrichedView.map(({ lead, others }, idx) => {
                            const n = (lead.original_index ?? idx) + 1;
                            const stars = authorityStars(lead.source_authority);
                            return (_jsx("li", { id: `fuente-${n}`, className: "p-3 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 transition-colors", children: _jsxs("div", { className: "flex items-start gap-3 min-w-0", children: [_jsx("span", { className: "shrink-0 w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center text-xs font-bold border border-cyan-200", children: n }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("a", { href: lead.url, target: "_blank", rel: "noreferrer noopener", className: "text-sm font-semibold text-slate-900 hover:text-cyan-700 break-words line-clamp-2 block", children: lead.title || lead.url }), _jsxs("div", { className: "flex items-center gap-2 mt-1 flex-wrap", children: [_jsxs(Badge, { className: `${relevanceClasses(lead.relevance_score)} border text-[10px] uppercase`, children: ["Relevancia ", Math.round(lead.relevance_score)] }), _jsxs("span", { className: "text-[10px] font-semibold text-amber-700", title: `Autoridad ${lead.source_authority}/100`, children: ['★'.repeat(stars), _jsx("span", { className: "text-slate-300", children: '★'.repeat(5 - stars) })] }), lead.sentiment && (_jsx(Badge, { className: `${sentimentClasses(lead.sentiment)} border text-[10px] uppercase`, children: sentimentLabel(lead.sentiment) })), lead.source && (_jsx("span", { className: "text-[11px] text-slate-500 font-semibold", children: lead.source })), (lead.cluster_size ?? 1) > 1 && (_jsxs(Badge, { className: "bg-violet-100 text-violet-700 border-violet-200 border text-[10px]", children: ["Agrupada (", lead.cluster_size, ")"] }))] }), lead.relevance_reason && (_jsx("p", { className: "mt-1.5 text-[11px] text-slate-500 italic break-words line-clamp-2", children: lead.relevance_reason })), others.length > 0 && (_jsxs("details", { className: "mt-2", children: [_jsxs("summary", { className: "text-[11px] text-slate-500 cursor-pointer font-semibold hover:text-slate-700", children: ["+", others.length, " fuente", others.length !== 1 ? 's' : '', " similar", others.length !== 1 ? 'es' : ''] }), _jsx("ul", { className: "mt-1.5 space-y-1 pl-3", children: others.map((o, i) => (_jsx("li", { className: "text-[11px]", children: _jsxs("a", { href: o.url, target: "_blank", rel: "noreferrer noopener", className: "text-slate-600 hover:text-cyan-700 break-words", children: [o.source ? `${o.source} — ` : '', o.title || o.url] }) }, i))) })] }))] })] }) }, lead.url ?? idx));
                        }) })] })) : (_jsx(LegacySourcesList, { items: items, perItem: perItem }))] }));
}
function LegacySourcesList({ items, perItem, }) {
    return (_jsxs("div", { children: [_jsxs("h3", { className: "font-display text-xl font-bold mb-3 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-cyan-600 text-[22px]", children: "format_list_numbered" }), "Fuentes (", items.length, ")"] }), _jsx("ol", { className: "space-y-2 list-none pl-0", children: items.map((it, idx) => {
                    const mapped = it.url ? perItem[it.url] : undefined;
                    const sentiment = mapped ?? it.sentiment;
                    const n = idx + 1;
                    return (_jsxs("li", { id: `fuente-${n}`, className: "flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 transition-colors min-w-0", children: [_jsx("span", { className: "shrink-0 w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center text-xs font-bold border border-cyan-200", children: n }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("a", { href: it.url, target: "_blank", rel: "noreferrer noopener", className: "text-sm font-semibold text-slate-900 hover:text-cyan-700 break-words line-clamp-2 block", children: it.title ?? it.url }), _jsxs("div", { className: "flex items-center gap-2 mt-1 flex-wrap", children: [sentiment && (_jsx(Badge, { className: `${sentimentClasses(sentiment)} border text-[10px] uppercase`, children: sentimentLabel(sentiment) })), it.source && (_jsx("span", { className: "text-[11px] text-slate-500 font-semibold", children: it.source })), it.published_at && (_jsxs("span", { className: "text-[11px] text-slate-400", children: ["\u00B7 ", fmtDate(it.published_at)] }))] })] })] }, `${it.url ?? idx}`));
                }) })] }));
}
/**
 * Renderiza un texto con citas inline tipo [1][2] como superíndices clickables
 * que saltan a #fuente-N (y en hover muestran el título de la noticia).
 */
function NarrativeWithCitations({ narrative, items, }) {
    // Regex: captura [N] o [N,M] o [N][M] — los separa en citas individuales
    const parts = useMemo(() => {
        const out = [];
        const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
        let lastIdx = 0;
        let m;
        while ((m = re.exec(narrative)) !== null) {
            if (m.index > lastIdx) {
                out.push({ type: 'text', content: narrative.slice(lastIdx, m.index) });
            }
            const nums = m[1].split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
            for (const n of nums) {
                out.push({ type: 'cite', n });
            }
            lastIdx = m.index + m[0].length;
        }
        if (lastIdx < narrative.length) {
            out.push({ type: 'text', content: narrative.slice(lastIdx) });
        }
        return out;
    }, [narrative]);
    return (_jsx("div", { className: "whitespace-pre-wrap", children: parts.map((p, i) => {
            if (p.type === 'text')
                return _jsx("span", { children: p.content }, i);
            const item = items[p.n - 1];
            return (_jsx("a", { href: item?.url ?? `#fuente-${p.n}`, onClick: (e) => {
                    if (!item?.url) {
                        e.preventDefault();
                        document
                            .getElementById(`fuente-${p.n}`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, target: item?.url ? '_blank' : undefined, rel: item?.url ? 'noreferrer noopener' : undefined, title: item?.title ?? `Fuente ${p.n}`, className: "inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 mx-0.5 text-[10px] font-bold rounded-md bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 transition-colors align-super no-underline", children: p.n }, i));
        }) }));
}
