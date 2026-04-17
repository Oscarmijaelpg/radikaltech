import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Skeleton, Spinner, } from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useScheduledReports, useCreateScheduledReport, useUpdateScheduledReport, useDeleteScheduledReport, useRunScheduledReportNow, } from '../api/scheduled-reports';
const KIND_OPTIONS = [
    { value: 'news_digest', label: 'Digest de noticias' },
    { value: 'competition_weekly', label: 'Competencia semanal' },
    { value: 'brand_monthly', label: 'Estrategia de marca mensual' },
    { value: 'custom', label: 'Custom' },
];
const FREQ_OPTIONS = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
];
function formatDate(iso) {
    if (!iso)
        return '—';
    return new Date(iso).toLocaleString('es', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
export function ScheduledReportsSection({ projectId }) {
    const confirmDialog = useConfirm();
    const q = useScheduledReports(projectId);
    const createMut = useCreateScheduledReport();
    const updateMut = useUpdateScheduledReport();
    const deleteMut = useDeleteScheduledReport();
    const runNowMut = useRunScheduledReportNow();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('brand_monthly');
    const [frequency, setFrequency] = useState('weekly');
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const onSubmit = async () => {
        if (!title.trim())
            return;
        const config = {};
        if (kind === 'news_digest' && topic.trim())
            config.topic = topic.trim();
        await createMut.mutateAsync({
            project_id: projectId,
            kind,
            frequency,
            title: title.trim(),
            config,
        });
        setOpen(false);
        setTitle('');
        setTopic('');
        setKind('brand_monthly');
        setFrequency('weekly');
    };
    return (_jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-display font-black text-base", children: "Reportes programados" }), _jsx("p", { className: "text-xs text-slate-500", children: "Automatiza la generaci\u00F3n peri\u00F3dica de reportes." })] }), _jsxs(Button, { size: "sm", onClick: () => setOpen(true), children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), "Nuevo"] })] }), q.isLoading ? (_jsx(Skeleton, { className: "h-20" })) : (q.data ?? []).length === 0 ? (_jsx("p", { className: "text-xs text-slate-500 text-center py-4", children: "A\u00FAn no tienes reportes programados." })) : (_jsx("ul", { className: "space-y-2", children: (q.data ?? []).map((sr) => (_jsxs("li", { className: "flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 p-3 rounded-xl border border-slate-200 bg-white", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-semibold text-slate-900 truncate", children: sr.title }), _jsxs("p", { className: "text-[11px] text-slate-500", children: [KIND_OPTIONS.find((k) => k.value === sr.kind)?.label ?? sr.kind, " \u00B7", ' ', FREQ_OPTIONS.find((f) => f.value === sr.frequency)?.label ?? sr.frequency, ' ', "\u00B7 pr\u00F3x: ", formatDate(sr.nextRunAt)] })] }), _jsx("button", { type: "button", disabled: updateMut.isPending, onClick: () => updateMut.mutate({
                                id: sr.id,
                                project_id: projectId,
                                patch: { enabled: !sr.enabled },
                            }), className: `text-[10px] px-2 py-1 rounded-full font-black uppercase ${sr.enabled
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'} disabled:opacity-50`, children: updateMut.isPending ? (_jsx(Spinner, { className: "h-3 w-3" })) : sr.enabled ? 'Activo' : 'Pausado' }), _jsx("button", { type: "button", disabled: runNowMut.isPending, onClick: () => runNowMut.mutate({ id: sr.id, project_id: projectId }), className: "p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 grid place-items-center", "aria-label": "Ejecutar ahora", title: "Ejecutar ahora", children: runNowMut.isPending ? (_jsx(Spinner, { className: "h-4 w-4" })) : (_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "play_arrow" })) }), _jsx("button", { type: "button", disabled: deleteMut.isPending, onClick: async () => {
                                const ok = await confirmDialog({ title: '¿Eliminar este reporte programado?', variant: 'danger', confirmLabel: 'Eliminar' });
                                if (!ok)
                                    return;
                                deleteMut.mutate({ id: sr.id, project_id: projectId });
                            }, className: "p-2 sm:p-1.5 rounded-lg hover:bg-red-50 text-red-600 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 grid place-items-center disabled:opacity-50", "aria-label": "Eliminar", children: deleteMut.isPending ? (_jsx(Spinner, { className: "h-4 w-4" })) : (_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "delete" })) })] }, sr.id))) })), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Nuevo reporte programado" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1", children: "T\u00EDtulo" }), _jsx(Input, { value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Ej. Auditor\u00EDa mensual" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1", children: "Tipo" }), _jsx("select", { value: kind, onChange: (e) => setKind(e.target.value), className: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm", children: KIND_OPTIONS.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1", children: "Frecuencia" }), _jsx("select", { value: frequency, onChange: (e) => setFrequency(e.target.value), className: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm", children: FREQ_OPTIONS.map((o) => (_jsx("option", { value: o.value, children: o.label }, o.value))) })] }), kind === 'news_digest' && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1", children: "Tema (opcional)" }), _jsx(Input, { value: topic, onChange: (e) => setTopic(e.target.value), placeholder: "Ej. marketing digital" })] })), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx(Button, { variant: "ghost", onClick: () => setOpen(false), children: "Cancelar" }), _jsxs(Button, { onClick: () => void onSubmit(), disabled: !title.trim() || createMut.isPending, children: [createMut.isPending && _jsx(Spinner, { className: "h-4 w-4 mr-1" }), createMut.isPending ? 'Creando...' : 'Crear'] })] })] })] }) })] }));
}
