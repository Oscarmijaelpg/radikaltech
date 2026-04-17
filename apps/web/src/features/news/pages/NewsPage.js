import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, Input, Button, Badge, Spinner, Skeleton } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { cn } from '@/shared/utils/cn';
import { useAggregateNews, useSavedNewsReports, } from '../api/news';
import { useSiraContextual } from '@/features/sira-contextual';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { HelpButton } from '@/shared/ui/HelpButton';
import { AnalysisSubnav } from '@/shared/ui/AnalysisSubnav';
function parseReportItems(r) {
    try {
        if (Array.isArray(r.sourceData))
            return r.sourceData;
        if (r.content) {
            const parsed = JSON.parse(r.content);
            if (Array.isArray(parsed))
                return parsed;
        }
    }
    catch {
        /* noop */
    }
    return [];
}
function relativeDate(iso) {
    if (!iso)
        return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '';
    try {
        return formatDistanceToNow(d, { addSuffix: true, locale: es });
    }
    catch {
        return '';
    }
}
export function NewsPage() {
    const { activeProject } = useProject();
    const [topic, setTopic] = useState('');
    const [currentTopic, setCurrentTopic] = useState(null);
    const [items, setItems] = useState([]);
    const aggregate = useAggregateNews();
    const saved = useSavedNewsReports(activeProject?.id);
    const sira = useSiraContextual();
    const askSiraAbout = (item) => {
        sira.openWith({
            kind: 'news',
            id: item.url,
            title: item.title,
            data: { item, topic: currentTopic },
        });
    };
    const onSearch = async (q) => {
        const query = q.trim();
        if (!query)
            return;
        setCurrentTopic(query);
        try {
            const res = await aggregate.mutateAsync({
                topic: query,
                project_id: activeProject?.id,
            });
            setItems(res.result.items);
        }
        catch {
            setItems([]);
        }
    };
    const rerunSaved = (r) => {
        const t = r.title.replace(/^Noticias:\s*/i, '').trim() || r.title;
        setTopic(t);
        // Show cached results immediately and also trigger a fresh search
        const cached = parseReportItems(r);
        if (cached.length) {
            setCurrentTopic(t);
            setItems(cached);
        }
        void onSearch(t);
    };
    const hasResults = items.length > 0;
    const loading = aggregate.isPending;
    const savedList = useMemo(() => saved.data ?? [], [saved.data]);
    return (_jsx("div", { className: "min-h-full bg-gradient-to-br from-cyan-50/40 via-white to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950", children: _jsxs("div", { className: "p-4 sm:p-6 md:p-8 max-w-7xl mx-auto", children: [_jsx(AnalysisSubnav, {}), _jsxs("header", { className: "mb-6 md:mb-8 relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-cyan-500 to-blue-600 p-6 md:p-10 text-white shadow-2xl", children: [_jsx("div", { className: "absolute top-4 right-4 z-20", children: _jsx(HelpButton, { title: "Noticias", description: "Busca noticias sobre tu sector. La IA las analiza y te dice cu\u00E1les son relevantes para tu marca.", tips: [
                                    'Describe el tema con detalle para mejores resultados.',
                                    'Los resultados se guardan como reportes de noticias.',
                                    'Pregúntale a Sira sobre cualquier noticia con un click.',
                                ] }) }), _jsx("div", { className: "absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" }), _jsxs("div", { className: "relative z-10", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest opacity-80 mb-2", children: "Monitoreo inteligente" }), _jsx("h1", { className: "text-3xl md:text-5xl font-display font-black tracking-tight", children: "Noticias" }), _jsx("p", { className: "text-white/80 mt-3 text-base md:text-lg max-w-2xl", children: "Sira rastrea las noticias m\u00E1s relevantes de los \u00FAltimos 14 d\u00EDas para mantenerte al d\u00EDa sobre lo que importa a tu marca." }), _jsxs("div", { className: "mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3", children: [_jsx(Input, { value: topic, onChange: (e) => setTopic(e.target.value), onKeyDown: (e) => {
                                                if (e.key === 'Enter')
                                                    void onSearch(topic);
                                            }, placeholder: "\u00BFQu\u00E9 te interesa monitorear? Ej. Tendencias IA 2026", className: "flex-1 min-w-0 !bg-white/95 !text-slate-900 placeholder:text-slate-400 h-14 text-base" }), _jsxs(Button, { onClick: () => void onSearch(topic), disabled: !topic.trim() || loading, className: "h-14 px-8 bg-white !text-cyan-700 hover:bg-white/90", children: [_jsx("span", { className: "material-symbols-outlined text-[20px]", children: "search" }), "Buscar"] })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6", children: [_jsx("aside", { className: "order-2 lg:order-1", children: _jsxs(Card, { className: "p-5 sticky top-4", children: [_jsx("h3", { className: "font-display text-sm font-black uppercase tracking-tight mb-3 text-slate-700", children: "B\u00FAsquedas guardadas" }), !activeProject ? (_jsx("p", { className: "text-xs text-slate-500", children: "Selecciona un proyecto para guardar b\u00FAsquedas." })) : saved.isLoading ? (_jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-12 w-full" }), _jsx(Skeleton, { className: "h-12 w-full" }), _jsx(Skeleton, { className: "h-12 w-full" })] })) : savedList.length === 0 ? (_jsx("p", { className: "text-xs text-slate-500", children: "Tus b\u00FAsquedas aparecer\u00E1n aqu\u00ED despu\u00E9s de tu primer rastreo." })) : (_jsx("ul", { className: "space-y-1", children: savedList.map((r) => {
                                            const label = r.title.replace(/^Noticias:\s*/i, '');
                                            return (_jsx("li", { children: _jsxs("button", { onClick: () => rerunSaved(r), className: cn('w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-50 transition-colors', currentTopic &&
                                                        label.toLowerCase() === currentTopic.toLowerCase() &&
                                                        'bg-cyan-50 border border-cyan-200'), children: [_jsx("p", { className: "text-sm font-semibold text-slate-800 truncate", children: label }), _jsx("p", { className: "text-[11px] text-slate-500 mt-0.5", children: relativeDate(r.createdAt) })] }) }, r.id));
                                        }) }))] }) }), _jsxs("section", { className: "order-1 lg:order-2 relative min-h-[320px]", children: [loading && (_jsx("div", { className: "absolute inset-0 z-20 rounded-3xl bg-white/70 backdrop-blur-sm grid place-items-center", children: _jsxs("div", { className: "flex flex-col items-center gap-4 text-center px-6", children: [_jsx(Spinner, { size: "lg" }), _jsx("p", { className: "font-display font-semibold text-slate-700", children: "Sira est\u00E1 buscando las noticias m\u00E1s relevantes..." }), currentTopic && (_jsxs("p", { className: "text-xs text-slate-500", children: ["Tema: ", currentTopic] }))] }) })), !loading && !hasResults && !currentTopic && (_jsx(Card, { className: "p-6", children: _jsx(CharacterEmpty, { character: "sira", title: "Dime qu\u00E9 tema monitorear", message: "Yo rastreo el mundo por ti. Escribe un tema y te traigo las noticias m\u00E1s recientes de los \u00FAltimos 14 d\u00EDas." }) })), !loading && currentTopic && !hasResults && (_jsxs(Card, { className: "p-10 text-center", children: [_jsx("h3", { className: "font-display text-xl font-bold mb-2", children: "Sin resultados" }), _jsxs("p", { className: "text-sm text-slate-500", children: ["No encontramos noticias recientes para", ' ', _jsx("span", { className: "font-semibold", children: currentTopic }), ". Prueba con otros t\u00E9rminos."] })] })), hasResults && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-between mb-4 px-1", children: [_jsxs("h2", { className: "font-display text-xl font-bold", children: ["Resultados", ' ', _jsxs("span", { className: "text-sm text-slate-500 font-normal", children: ["(", items.length, " noticias)"] })] }), currentTopic && (_jsx(Badge, { className: "bg-cyan-100 text-cyan-700 border border-cyan-200", children: currentTopic }))] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4", children: items.map((it, idx) => (_jsxs(Card, { className: "p-5 flex flex-col gap-3 hover:shadow-xl transition-shadow", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [it.source && (_jsx(Badge, { className: "bg-slate-100 text-slate-700 border border-slate-200 text-[10px] uppercase", children: it.source })), it.published_at && (_jsx("span", { className: "text-[11px] text-slate-500", children: relativeDate(it.published_at) }))] }), _jsx("h3", { className: "font-display font-bold text-slate-900 leading-snug line-clamp-3", children: it.title }), it.summary && (_jsx("p", { className: "text-sm text-slate-600 line-clamp-4", children: it.summary })), _jsxs("div", { className: "mt-auto flex items-center justify-between gap-2", children: [_jsxs("a", { href: it.url, target: "_blank", rel: "noreferrer noopener", className: "inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800", children: ["Leer m\u00E1s", _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "open_in_new" })] }), _jsxs("button", { type: "button", onClick: () => askSiraAbout(it), className: "inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-cyan-700 px-3 py-2 rounded-lg hover:bg-cyan-50 transition-colors min-h-[44px]", "aria-label": "Preguntar a Sira", children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: "forum" }), "Preguntar a Sira"] })] })] }, `${it.url}-${idx}`))) })] }))] })] })] }) }));
}
