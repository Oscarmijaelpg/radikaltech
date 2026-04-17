import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, Button, Spinner, EmptyState } from '@radikal/ui';
import { api } from '@/lib/api';
import { useToast } from '@/shared/ui/Toaster';
export function useDetectTrends() {
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/ai-services/detect-trends', input);
            return r.data;
        },
    });
}
const MOMENTUM_META = {
    rising: { label: 'En alza', className: 'bg-emerald-500', icon: 'trending_up' },
    peaking: { label: 'En pico', className: 'bg-amber-500', icon: 'local_fire_department' },
    cooling: { label: 'Enfriando', className: 'bg-slate-400', icon: 'trending_down' },
};
export function TrendingWidget({ projectId }) {
    const { toast } = useToast();
    const [trends, setTrends] = useState(null);
    const detect = useDetectTrends();
    async function handleDetect() {
        if (!projectId)
            return;
        try {
            const res = await detect.mutateAsync({ project_id: projectId });
            setTrends(res.trends ?? []);
        }
        catch (err) {
            console.error(err);
            toast({ title: 'No se pudieron detectar tendencias', variant: 'error' });
        }
    }
    async function handleCreateRec(trend) {
        if (!projectId)
            return;
        try {
            await api.post('/recommendations', {
                project_id: projectId,
                kind: 'strategy',
                title: trend.name,
                why: trend.description,
                action_label: 'Actuar sobre tendencia',
                action_kind: 'custom',
                action_payload: { trend },
                impact: trend.relevance_score >= 75
                    ? 'high'
                    : trend.relevance_score >= 50
                        ? 'medium'
                        : 'low',
                sources: trend.evidence.map((e) => ({
                    type: e.type === 'news' ? 'news' : 'competitor',
                    title: e.title,
                    url: e.url,
                })),
            });
            toast({ title: 'Recomendación creada', variant: 'success' });
        }
        catch {
            toast({ title: 'No se pudo crear la recomendación', variant: 'error' });
        }
    }
    return (_jsxs(Card, { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5", children: [_jsxs("div", { className: "flex items-center gap-2 sm:gap-3 min-w-0", children: [_jsx("div", { className: "w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center text-white shadow-md shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[18px] sm:text-[20px]", children: "local_fire_department" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "font-display font-black text-base sm:text-lg", children: "Tendencias en tu sector" }), _jsx("p", { className: "text-[10px] sm:text-xs text-slate-500 truncate", children: "Noticias recientes + formatos virales de competidores" })] })] }), _jsx(Button, { variant: "outline", size: "sm", className: "self-start sm:self-auto shrink-0", onClick: handleDetect, disabled: !projectId || detect.isPending, children: detect.isPending ? (_jsxs(_Fragment, { children: [_jsx(Spinner, { className: "w-4 h-4" }), "Analizando\u2026"] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "bolt" }), "Detectar ahora"] })) })] }), detect.isPending ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3", children: [...Array(4)].map((_, i) => (_jsx("div", { className: "h-32 sm:h-36 rounded-2xl bg-slate-100 animate-pulse" }, i))) })) : trends === null ? (_jsx(EmptyState, { icon: _jsx("span", { className: "material-symbols-outlined text-[28px]", children: "insights" }), title: "A\u00FAn no has detectado tendencias", description: "Cruzamos noticias de los \u00FAltimos 7 d\u00EDas con los posts virales de tus competidores.", action: projectId ? (_jsxs(Button, { onClick: handleDetect, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "bolt" }), "Detectar ahora"] })) : undefined })) : trends.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500 text-center py-6", children: "No encontramos tendencias claras en este momento." })) : (_jsx("ul", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3", children: trends.slice(0, 6).map((t, i) => {
                    const meta = MOMENTUM_META[t.momentum];
                    return (_jsxs("li", { className: "p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white flex flex-col gap-1.5 sm:gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${meta.className}`, children: [_jsx("span", { className: "material-symbols-outlined text-[12px]", children: meta.icon }), meta.label] }), _jsx("span", { className: "text-[10px] font-black uppercase tracking-widest text-slate-400", children: t.category }), _jsxs("span", { className: "ml-auto text-[11px] font-bold text-slate-500", children: [t.relevance_score, "/100"] })] }), _jsx("p", { className: "text-sm font-bold text-slate-900", children: t.name }), _jsx("p", { className: "text-xs text-slate-600 line-clamp-3", children: t.description }), t.suggested_action && (_jsxs("p", { className: "text-[11px] text-slate-500 italic line-clamp-2", children: ["Acci\u00F3n: ", t.suggested_action] })), _jsx("div", { className: "mt-auto", children: _jsxs(Button, { size: "sm", variant: "outline", onClick: () => handleCreateRec(t), children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: "add" }), "Crear recomendaci\u00F3n"] }) })] }, i));
                }) }))] }));
}
