import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, Button, Dialog, DialogContent, DialogHeader, DialogTitle, } from '@radikal/ui';
import { useBrandHistory } from '../../api/memory/brand';
const TYPE_META = {
    brand_profile: {
        icon: 'edit_note',
        color: 'from-cyan-500 to-blue-500',
        label: 'Perfil de marca',
    },
    logo: { icon: 'image', color: 'from-pink-500 to-rose-500', label: 'Logo' },
    palette: {
        icon: 'palette',
        color: 'from-amber-500 to-orange-500',
        label: 'Paleta',
    },
    identity_change: {
        icon: 'auto_awesome',
        color: 'from-violet-500 to-purple-500',
        label: 'Identidad',
    },
};
const TRACKED_FIELDS = [
    { key: 'voiceTone', label: 'Tono / voz' },
    { key: 'essence', label: 'Esencia' },
    { key: 'mission', label: 'Misión' },
    { key: 'vision', label: 'Visión' },
    { key: 'visualDirection', label: 'Dirección visual' },
    { key: 'colorPalette', label: 'Paleta' },
    { key: 'brandValues', label: 'Valores' },
    { key: 'targetAudience', label: 'Audiencia' },
    { key: 'competitiveAdvantage', label: 'Ventaja competitiva' },
];
function formatValue(v) {
    if (v == null)
        return '—';
    if (Array.isArray(v))
        return v.length > 0 ? v.join(', ') : '—';
    if (typeof v === 'object')
        return JSON.stringify(v);
    return String(v);
}
function DiffDialog({ entry, onClose, }) {
    return (_jsx(Dialog, { open: !!entry, onOpenChange: (o) => !o && onClose(), children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-3xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Cambios en la identidad" }) }), entry && (_jsx("div", { className: "space-y-3 max-h-[60vh] overflow-y-auto", children: TRACKED_FIELDS.map((f) => {
                        const prev = entry.previous?.[f.key];
                        const curr = entry.current?.[f.key];
                        const changed = JSON.stringify(prev ?? null) !== JSON.stringify(curr ?? null);
                        if (!changed)
                            return null;
                        return (_jsxs("div", { className: "rounded-xl border border-slate-200 p-3 bg-white", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2", children: f.label }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { className: "rounded-lg bg-rose-50 p-2 border border-rose-100", children: [_jsx("p", { className: "text-[10px] font-bold text-rose-600 mb-1", children: "Antes" }), _jsx("p", { className: "text-slate-700 whitespace-pre-wrap break-words", children: formatValue(prev) })] }), _jsxs("div", { className: "rounded-lg bg-emerald-50 p-2 border border-emerald-100", children: [_jsx("p", { className: "text-[10px] font-bold text-emerald-600 mb-1", children: "Despu\u00E9s" }), _jsx("p", { className: "text-slate-700 whitespace-pre-wrap break-words", children: formatValue(curr) })] })] })] }, f.key));
                    }) }))] }) }));
}
export function BrandHistory({ projectId }) {
    const [open, setOpen] = useState(false);
    const [diffEntry, setDiffEntry] = useState(null);
    const { data = [], isLoading } = useBrandHistory(open ? projectId : null);
    return (_jsxs(Card, { className: "p-5", children: [_jsxs("button", { type: "button", onClick: () => setOpen((o) => !o), className: "w-full flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 grid place-items-center text-white shadow-md", children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: "history" }) }), _jsxs("div", { className: "text-left", children: [_jsx("h3", { className: "font-display font-black text-base sm:text-lg", children: "Historial de identidad" }), _jsx("p", { className: "text-xs text-slate-500", children: "Cambios relevantes a lo largo del tiempo" })] })] }), _jsx("span", { className: "material-symbols-outlined text-slate-400", children: open ? 'expand_less' : 'expand_more' })] }), open && (_jsx("div", { className: "mt-5", children: isLoading ? (_jsx("p", { className: "text-sm text-slate-400 py-6 text-center", children: "Cargando\u2026" })) : data.length === 0 ? (_jsx("p", { className: "text-sm text-slate-400 py-6 text-center", children: "A\u00FAn no hay cambios registrados." })) : (_jsx("ol", { className: "relative border-l-2 border-slate-200 ml-2 sm:ml-4 space-y-4 sm:space-y-5", children: data.map((entry) => {
                        const meta = TYPE_META[entry.snapshotType] ?? {
                            icon: 'circle',
                            color: 'from-slate-400 to-slate-600',
                            label: entry.snapshotType,
                        };
                        return (_jsxs("li", { className: "ml-4 sm:ml-6", children: [_jsx("span", { className: `absolute -left-[13px] w-6 h-6 rounded-full bg-gradient-to-br ${meta.color} grid place-items-center text-white shadow`, children: _jsx("span", { className: "material-symbols-outlined text-[14px]", children: meta.icon }) }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 mb-1", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500", children: meta.label }), _jsx("p", { className: "text-[11px] text-slate-400", children: formatDistanceToNow(new Date(entry.createdAt), {
                                                        addSuffix: true,
                                                        locale: es,
                                                    }) })] }), _jsx("p", { className: "text-sm text-slate-700", children: entry.changeSummary ?? 'Se registraron cambios en la identidad.' }), _jsx("div", { className: "mt-2", children: _jsxs(Button, { size: "sm", variant: "outline", onClick: () => setDiffEntry(entry), children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "compare_arrows" }), "Ver diff"] }) })] })] }, entry.id));
                    }) })) })), _jsx(DiffDialog, { entry: diffEntry, onClose: () => setDiffEntry(null) })] }));
}
