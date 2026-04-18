import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Spinner, } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useDetectMarkets, useUpdateMarkets } from '../../api/memory';
import { SectionTitle } from './shared';
import { LATAM_COUNTRIES, countryName, flagFromIso } from './utils';
export function MarketsSection({ projectId }) {
    const { activeProject } = useProject();
    const detect = useDetectMarkets(projectId);
    const updateMarkets = useUpdateMarkets(projectId);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [draft, setDraft] = useState([]);
    if (!activeProject)
        return null;
    const confirmed = activeProject.operating_countries ?? [];
    const suggestedAll = activeProject.operating_countries_suggested ?? [];
    const suggestedDistinct = suggestedAll.filter((c) => !confirmed.includes(c));
    const openDialog = () => {
        setDraft(confirmed.length > 0 ? confirmed : suggestedAll);
        setDialogOpen(true);
    };
    const toggle = (code) => {
        setDraft((d) => (d.includes(code) ? d.filter((x) => x !== code) : [...d, code]));
    };
    const save = async () => {
        await updateMarkets.mutateAsync(draft);
        setDialogOpen(false);
    };
    const confirmSuggested = async () => {
        const merged = Array.from(new Set([...confirmed, ...suggestedAll]));
        await updateMarkets.mutateAsync(merged);
    };
    return (_jsxs(Card, { className: "p-4 sm:p-6 md:p-8 bg-white border-white", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4", children: [_jsx(SectionTitle, { icon: "public", children: "Mercados donde operas" }), _jsxs("div", { className: "flex gap-2 shrink-0", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => detect.mutate(), disabled: detect.isPending, children: detect.isPending ? _jsx(Spinner, {}) : 'Detectar con IA' }), _jsx(Button, { size: "sm", variant: "outline", onClick: openDialog, children: "Editar mercados" })] })] }), confirmed.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: confirmed.map((code) => (_jsxs("span", { className: "px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm font-semibold flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: flagFromIso(code) }), countryName(code)] }, code))) })) : (_jsx("p", { className: "text-xs italic text-slate-400", children: "A\u00FAn no has confirmado mercados" })), suggestedDistinct.length > 0 && (_jsxs("div", { className: "mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-amber-700 text-[20px]", children: "auto_awesome" }), _jsx("p", { className: "text-sm text-amber-900 font-semibold", children: "IA detect\u00F3 estos mercados. \u00BFConfirmas?" })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: suggestedDistinct.map((code) => (_jsxs("span", { className: "px-3 py-1.5 rounded-full bg-white border border-amber-300 text-amber-900 text-sm font-semibold flex items-center gap-1.5", children: [_jsx("span", { className: "text-base", children: flagFromIso(code) }), countryName(code)] }, code))) }), _jsx(Button, { size: "sm", onClick: confirmSuggested, disabled: updateMarkets.isPending, children: "Confirmar mercados" })] })), _jsx(Dialog, { open: dialogOpen, onOpenChange: setDialogOpen, children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-lg h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Mercados donde operas" }) }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-auto py-2", children: LATAM_COUNTRIES.map((c) => {
                                const checked = draft.includes(c.code);
                                return (_jsxs("button", { type: "button", onClick: () => toggle(c.code), className: `flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left ${checked
                                        ? 'bg-[hsl(var(--color-primary))] text-white border-[hsl(var(--color-primary))]'
                                        : 'bg-white text-slate-700 border-slate-200'}`, children: [_jsx("span", { children: flagFromIso(c.code) }), _jsx("span", { className: "truncate", children: c.name })] }, c.code));
                            }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setDialogOpen(false), children: "Cancelar" }), _jsx(Button, { onClick: save, disabled: updateMarkets.isPending, children: "Guardar" })] })] }) })] }));
}
