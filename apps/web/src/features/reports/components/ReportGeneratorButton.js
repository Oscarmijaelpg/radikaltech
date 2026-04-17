import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Spinner, } from '@radikal/ui';
import { useCompetitors } from '@/features/memory/api/memory';
import { useAggregateNewsReport, useGenerateBrandStrategy, useGenerateCompetition, useGenerateMonthlyAudit, useGenerateUnified, } from '../api/reports';
export function ReportGeneratorButton({ projectId, onCreated }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [mode, setMode] = useState(null);
    const [competitorId, setCompetitorId] = useState('');
    const [topic, setTopic] = useState('');
    const [error, setError] = useState(null);
    const competitors = useCompetitors(projectId);
    const brandStrategy = useGenerateBrandStrategy();
    const audit = useGenerateMonthlyAudit();
    const competition = useGenerateCompetition();
    const news = useAggregateNewsReport();
    const unified = useGenerateUnified();
    const busy = brandStrategy.isPending || audit.isPending || competition.isPending || news.isPending || unified.isPending;
    const openMode = (m) => {
        setMenuOpen(false);
        setMode(m);
        setError(null);
    };
    const close = () => {
        if (busy)
            return;
        setMode(null);
        setCompetitorId('');
        setTopic('');
        setError(null);
    };
    const runBrand = async () => {
        setError(null);
        try {
            const r = await brandStrategy.mutateAsync({ project_id: projectId });
            onCreated?.(r);
            close();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        }
    };
    const runAudit = async () => {
        setError(null);
        try {
            const r = await audit.mutateAsync({ project_id: projectId });
            onCreated?.(r);
            close();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        }
    };
    const runCompetition = async () => {
        if (!competitorId)
            return;
        setError(null);
        try {
            const r = await competition.mutateAsync({
                project_id: projectId,
                competitor_id: competitorId,
            });
            onCreated?.(r);
            close();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        }
    };
    const runUnified = async () => {
        setError(null);
        try {
            const r = await unified.mutateAsync({ project_id: projectId });
            onCreated?.(r);
            close();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        }
    };
    const runNews = async () => {
        if (!topic.trim())
            return;
        setError(null);
        try {
            const r = await news.mutateAsync({ project_id: projectId, topic: topic.trim() });
            if (r.report)
                onCreated?.({ id: r.report.id });
            close();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        }
    };
    return (_jsxs("div", { className: "relative", children: [_jsxs(Button, { onClick: () => setMenuOpen((v) => !v), children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), "Nuevo reporte", _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "expand_more" })] }), menuOpen && (_jsxs("div", { className: "absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-auto sm:w-72 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden z-30", children: [_jsx(MenuItem, { icon: "hub", title: "An\u00E1lisis 360\u00B0", subtitle: "Cruza marca + competidores + noticias + todo", onClick: () => openMode('unified') }), _jsx(MenuItem, { icon: "groups", title: "An\u00E1lisis de competencia", subtitle: "Consolida un competidor + sus posts", onClick: () => openMode('competition') }), _jsx(MenuItem, { icon: "newspaper", title: "Noticias del sector", subtitle: "Rastreo de \u00FAltimos 14 d\u00EDas", onClick: () => openMode('news') }), _jsx(MenuItem, { icon: "psychology", title: "Estrategia de marca", subtitle: "Diagn\u00F3stico + iniciativas + m\u00E9tricas", onClick: () => openMode('brand') }), _jsx(MenuItem, { icon: "calendar_month", title: "Auditor\u00EDa mensual", subtitle: "\u00DAltimos 30 d\u00EDas del proyecto", onClick: () => openMode('audit') })] })), _jsx(Dialog, { open: mode !== null, onOpenChange: (o) => { if (busy)
                    return; if (!o)
                    close(); }, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: [mode === 'unified' && 'Análisis 360°', mode === 'competition' && 'Análisis de competencia', mode === 'news' && 'Noticias del sector', mode === 'brand' && 'Estrategia de marca', mode === 'audit' && 'Auditoría mensual'] }) }), mode === 'unified' && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-slate-600", children: "Genera un an\u00E1lisis integral que cruza tu marca, competidores, noticias, recomendaciones activas y memoria del proyecto en un solo documento estrat\u00E9gico." }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: close, disabled: busy, children: "Cancelar" }), _jsxs(Button, { onClick: () => void runUnified(), disabled: busy, children: [unified.isPending && _jsx(Spinner, { className: "h-4 w-4 mr-1" }), "Generar 360\u00B0"] })] })] })), mode === 'competition' && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-slate-600", children: "Selecciona un competidor del proyecto." }), _jsxs("select", { value: competitorId, onChange: (e) => setCompetitorId(e.target.value), className: "flex h-12 w-full items-center justify-between rounded-2xl bg-slate-100 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:bg-white", children: [_jsx("option", { value: "", children: "\u2014 Elige competidor \u2014" }), (competitors.data ?? []).map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: close, disabled: busy, children: "Cancelar" }), _jsxs(Button, { onClick: () => void runCompetition(), disabled: !competitorId || busy, children: [competition.isPending && _jsx(Spinner, { className: "h-4 w-4 mr-1" }), "Generar"] })] })] })), mode === 'news' && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-slate-600", children: "Escribe un tema a monitorear." }), _jsx(Input, { value: topic, onChange: (e) => setTopic(e.target.value), placeholder: "Ej. Tendencias IA 2026" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: close, disabled: busy, children: "Cancelar" }), _jsxs(Button, { onClick: () => void runNews(), disabled: !topic.trim() || busy, children: [news.isPending && _jsx(Spinner, { className: "h-4 w-4 mr-1" }), "Generar"] })] })] })), mode === 'brand' && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-slate-600", children: "Se tomar\u00E1 el BrandProfile y el Project actual para sintetizar un informe con 5 secciones." }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: close, disabled: busy, children: "Cancelar" }), _jsxs(Button, { onClick: () => void runBrand(), disabled: busy, children: [brandStrategy.isPending && _jsx(Spinner, { className: "h-4 w-4 mr-1" }), "Generar"] })] })] })), mode === 'audit' && (_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-slate-600", children: "Consolidado de los \u00FAltimos 30 d\u00EDas del proyecto." }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: close, disabled: busy, children: "Cancelar" }), _jsxs(Button, { onClick: () => void runAudit(), disabled: busy, children: [audit.isPending && _jsx(Spinner, { className: "h-4 w-4 mr-1" }), "Generar"] })] })] })), error && _jsx("p", { className: "text-sm text-red-600", children: error })] }) })] }));
}
function MenuItem({ icon, title, subtitle, onClick, }) {
    return (_jsxs("button", { type: "button", onClick: onClick, className: "w-full flex items-start gap-3 px-4 py-3 min-h-[48px] hover:bg-violet-50 transition-colors text-left", children: [_jsx("span", { className: "material-symbols-outlined text-violet-600 text-[22px]", children: icon }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-slate-900", children: title }), _jsx("p", { className: "text-xs text-slate-500", children: subtitle })] })] }));
}
