import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/shared/utils/cn';
export function ToolResultCard({ tool, onOpenReport }) {
    if (tool.status !== 'done' || !tool.data)
        return null;
    switch (tool.name) {
        case 'generate_image':
            return _jsx(ImageResultCard, { data: tool.data });
        case 'search_news':
            return _jsx(NewsResultCard, { data: tool.data });
        case 'find_trends':
            return _jsx(TrendsResultCard, { data: tool.data });
        case 'get_competitor_data':
            return _jsx(CompetitorDataCard, { data: tool.data });
        case 'get_brand_profile':
            return _jsx(BrandProfileCard, { data: tool.data });
        case 'evaluate_content':
            return _jsx(ContentEvalCard, { data: tool.data });
        case 'analyze_website':
            return _jsx(WebsiteAnalysisCard, { data: tool.data });
        case 'generate_report':
            return _jsx(ReportCreatedCard, { data: tool.data, onOpenReport: onOpenReport });
        case 'detect_markets':
            return _jsx(MarketsCard, { data: tool.data });
        default:
            return null;
    }
}
function CardWrapper({ children, className }) {
    return (_jsx("div", { className: cn('rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 sm:p-4 my-2 not-prose overflow-hidden', className), children: children }));
}
function ImageResultCard({ data }) {
    const url = data.url;
    if (!url)
        return null;
    return (_jsxs(CardWrapper, { children: [_jsx("div", { className: "rounded-xl overflow-hidden border border-slate-200 shadow-sm", children: _jsx("img", { src: url, alt: "Imagen generada", className: "w-full max-h-[200px] sm:max-h-[300px] object-cover" }) }), _jsxs("p", { className: "text-[11px] text-slate-500 mt-2 flex items-center gap-1", children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: "palette" }), "Imagen generada con IA"] })] }));
}
function NewsResultCard({ data }) {
    const items = data.items;
    if (!items?.length)
        return null;
    return (_jsxs(CardWrapper, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center text-white", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "newspaper" }) }), _jsxs("p", { className: "text-xs font-bold text-slate-700", children: [items.length, " noticias encontradas"] })] }), _jsx("div", { className: "space-y-2", children: items.slice(0, 4).map((item, i) => (_jsxs("div", { className: "flex items-start gap-2 p-2 rounded-xl bg-white border border-slate-100", children: [_jsx("span", { className: "text-[11px] font-bold text-slate-400 mt-0.5 shrink-0", children: i + 1 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-xs font-semibold text-slate-800 line-clamp-2", children: item.title }), item.source && _jsx("p", { className: "text-[10px] text-slate-400 mt-0.5", children: item.source })] }), item.url && (_jsx("a", { href: item.url, target: "_blank", rel: "noreferrer", className: "shrink-0 text-cyan-600 hover:text-cyan-700", children: _jsx("span", { className: "material-symbols-outlined text-[14px]", children: "open_in_new" }) }))] }, i))) })] }));
}
function TrendsResultCard({ data }) {
    const trends = data.trends;
    if (!trends?.length)
        return null;
    const momentumColors = {
        rising: 'bg-emerald-100 text-emerald-700',
        peaking: 'bg-amber-100 text-amber-700',
        cooling: 'bg-slate-100 text-slate-600',
    };
    return (_jsxs(CardWrapper, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 grid place-items-center text-white", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "trending_up" }) }), _jsxs("p", { className: "text-xs font-bold text-slate-700", children: [trends.length, " tendencias detectadas"] })] }), _jsx("div", { className: "space-y-2", children: trends.slice(0, 5).map((t, i) => (_jsxs("div", { className: "p-2.5 rounded-xl bg-white border border-slate-100", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("p", { className: "text-xs font-bold text-slate-800 flex-1", children: t.name }), _jsx("span", { className: cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', momentumColors[t.momentum] ?? 'bg-slate-100 text-slate-600'), children: t.momentum }), _jsxs("span", { className: "text-[10px] font-bold text-violet-600", children: [t.relevance_score, "/100"] })] }), _jsx("p", { className: "text-[11px] text-slate-500 line-clamp-2", children: t.description })] }, i))) })] }));
}
function CompetitorDataCard({ data }) {
    if (data.competitors) {
        const comps = data.competitors;
        return (_jsxs(CardWrapper, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 grid place-items-center text-white", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "groups" }) }), _jsxs("p", { className: "text-xs font-bold text-slate-700", children: [comps.length, " competidores"] })] }), _jsx("div", { className: "space-y-1.5", children: comps.slice(0, 5).map((c, i) => {
                        const eng = c.engagement;
                        return (_jsxs("div", { className: "flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-100", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center text-slate-600 shrink-0", children: _jsx("span", { className: "text-xs font-bold", children: c.name[0] }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs font-semibold text-slate-800 truncate", children: c.name }), eng && (_jsxs("p", { className: "text-[10px] text-slate-400", children: [String(eng.total_posts ?? 0), " posts \u00B7 avg eng ", typeof eng.avg_engagement === 'number' ? String(Math.round(eng.avg_engagement)) : 'N/A'] }))] })] }, i));
                    }) })] }));
    }
    const name = data.name;
    const engagement = data.engagement;
    const topPosts = data.topPosts;
    return (_jsxs(CardWrapper, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 grid place-items-center text-white", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "person_search" }) }), _jsx("p", { className: "text-xs font-bold text-slate-700", children: name ?? 'Competidor' })] }), engagement && (_jsx("div", { className: "grid grid-cols-3 gap-1.5 sm:gap-2 mb-3", children: [
                    { label: 'Posts', value: engagement.total_posts },
                    { label: 'Avg Likes', value: typeof engagement.avg_likes === 'number' ? Math.round(engagement.avg_likes) : 'N/A' },
                    { label: 'Avg Eng', value: typeof engagement.avg_engagement === 'number' ? Math.round(engagement.avg_engagement) : 'N/A' },
                ].map((s) => (_jsxs("div", { className: "text-center p-2 rounded-xl bg-white border border-slate-100", children: [_jsx("p", { className: "text-lg font-black text-slate-800", children: String(s.value ?? 0) }), _jsx("p", { className: "text-[9px] font-bold text-slate-400 uppercase", children: s.label })] }, s.label))) })), topPosts && topPosts.length > 0 && (_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-[10px] font-bold text-slate-400 uppercase", children: "Top posts" }), topPosts.slice(0, 3).map((p, i) => (_jsxs("div", { className: "flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-50 text-[11px]", children: [_jsx("span", { className: "font-semibold text-slate-500", children: p.platform }), _jsx("span", { className: "text-slate-400", children: "\u00B7" }), _jsxs("span", { className: "text-rose-600 font-bold", children: [p.likes, " \u2764\uFE0F"] }), _jsx("span", { className: "text-slate-600 truncate flex-1", children: p.caption?.slice(0, 60) })] }, i)))] }))] }));
}
function BrandProfileCard({ data }) {
    const project = data.project;
    const brand = data.brand;
    if (!project)
        return null;
    return (_jsxs(CardWrapper, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center text-white", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "badge" }) }), _jsx("p", { className: "text-xs font-bold text-slate-700", children: project.name ?? 'Tu marca' })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-[11px]", children: [typeof project.industry === 'string' && project.industry ? (_jsxs("div", { className: "p-2 rounded-xl bg-white border border-slate-100", children: [_jsx("p", { className: "text-[9px] font-bold text-slate-400 uppercase", children: "Industria" }), _jsx("p", { className: "text-slate-700 font-semibold", children: project.industry })] })) : null, brand && typeof brand.voice_tone === 'string' && brand.voice_tone ? (_jsxs("div", { className: "p-2 rounded-xl bg-white border border-slate-100", children: [_jsx("p", { className: "text-[9px] font-bold text-slate-400 uppercase", children: "Tono" }), _jsx("p", { className: "text-slate-700 font-semibold truncate", children: brand.voice_tone })] })) : null, brand && Array.isArray(brand.values) && brand.values.length > 0 ? (_jsxs("div", { className: "p-2 rounded-xl bg-white border border-slate-100 col-span-2", children: [_jsx("p", { className: "text-[9px] font-bold text-slate-400 uppercase", children: "Valores" }), _jsx("div", { className: "flex flex-wrap gap-1 mt-1", children: brand.values.slice(0, 5).map((v, i) => (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-semibold", children: v }, i))) })] })) : null] })] }));
}
function ContentEvalCard({ data }) {
    const score = data.score;
    const feedback = data.feedback;
    const tags = data.tags;
    if (score === undefined)
        return null;
    const scoreColor = score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-rose-600';
    return (_jsxs(CardWrapper, { children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("div", { className: "w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center text-white shadow-md", children: _jsx("span", { className: cn('text-2xl font-black', scoreColor.replace('text-', 'text-white ')), children: score }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-bold text-slate-700", children: "Score est\u00E9tico" }), _jsx("p", { className: "text-[10px] text-slate-400", children: "de 10 puntos" })] })] }), tags && tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 mb-2", children: tags.slice(0, 8).map((t, i) => (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold", children: t }, i))) })), feedback && _jsx("p", { className: "text-[11px] text-slate-600 line-clamp-3", children: feedback.slice(0, 200) })] }));
}
function WebsiteAnalysisCard({ data }) {
    const info = data.detected_info;
    const logo = data.logo_url;
    if (!info)
        return null;
    return (_jsxs(CardWrapper, { children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [logo && (_jsx("div", { className: "w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden grid place-items-center shrink-0", children: _jsx("img", { src: logo, alt: "Logo", className: "w-full h-full object-contain p-1" }) })), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-bold text-slate-700", children: typeof info.brand_name === 'string' ? info.brand_name : 'Sitio analizado' }), typeof info.industry === 'string' ? _jsx("p", { className: "text-[10px] text-slate-400", children: info.industry }) : null] })] }), typeof info.business_summary === 'string' ? (_jsx("p", { className: "text-[11px] text-slate-600 line-clamp-3", children: info.business_summary.slice(0, 200) })) : null] }));
}
function ReportCreatedCard({ data, onOpenReport, }) {
    const title = data.title;
    const type = data.type;
    const content = data.content;
    const keyInsights = data.key_insights;
    if (!title)
        return null;
    const typeLabels = {
        brand_strategy: 'Estrategia de marca',
        monthly_audit: 'Auditoría mensual',
        competition: 'Análisis de competencia',
        general: 'Análisis 360°',
    };
    return (_jsxs(CardWrapper, { className: "border-violet-200 bg-gradient-to-br from-violet-50 to-white", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 grid place-items-center text-white shadow-md shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: "description" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs font-bold text-violet-800 truncate", children: title }), _jsxs("p", { className: "text-[10px] text-violet-500", children: [typeLabels[type ?? ''] ?? type ?? 'Reporte', " \u00B7 Generado"] })] })] }), keyInsights && keyInsights.length > 0 && (_jsx("div", { className: "mb-3 space-y-1", children: keyInsights.slice(0, 3).map((insight, i) => (_jsxs("p", { className: "text-[11px] text-slate-600 flex items-start gap-1.5", children: [_jsx("span", { className: "text-violet-500 shrink-0", children: "\u2022" }), _jsx("span", { className: "line-clamp-1", children: insight })] }, i))) })), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [content && onOpenReport && (_jsxs("button", { type: "button", onClick: () => onOpenReport(content), className: "flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors active:scale-95 min-h-[36px]", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "article" }), "Abrir informe"] })), _jsx("a", { href: "/reports", className: "text-[11px] font-bold text-violet-600 hover:underline", children: "Ver en Reportes \u2192" })] }), content && onOpenReport && (_jsx("p", { className: "mt-2 text-[10px] text-violet-400", children: "Al abrir el informe podr\u00E1s descargarlo como PDF o Word." }))] }));
}
function MarketsCard({ data }) {
    const countries = data.countries;
    const regions = data.regions;
    if (!countries?.length)
        return null;
    return (_jsxs(CardWrapper, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "public" }) }), _jsx("p", { className: "text-xs font-bold text-slate-700", children: "Mercados detectados" })] }), _jsxs("div", { className: "flex flex-wrap gap-1.5", children: [countries.map((c, i) => (_jsx("span", { className: "px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200", children: c }, i))), regions?.map((r, i) => (_jsx("span", { className: "px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold", children: r }, `r-${i}`)))] })] }));
}
