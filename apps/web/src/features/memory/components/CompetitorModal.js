import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, RadioGroup, RadioGroupItem, Spinner, Textarea, } from '@radikal/ui';
const SOCIAL_NETWORKS = [
    { key: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { key: 'tiktok', label: 'TikTok', icon: 'music_note' },
    { key: 'facebook', label: 'Facebook', icon: 'thumb_up' },
    { key: 'youtube', label: 'YouTube', icon: 'play_circle' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'work' },
    { key: 'x', label: 'X / Twitter', icon: 'alternate_email' },
];
export function CompetitorModal({ open, onOpenChange, initial, onSubmit, saving }) {
    const [form, setForm] = useState({
        name: '',
        website: '',
        notes: '',
        social_links: {},
        analysis_mode: 'combined',
    });
    useEffect(() => {
        if (open) {
            setForm({
                name: initial?.name ?? '',
                website: initial?.website ?? '',
                notes: initial?.notes ?? '',
                social_links: initial?.social_links ?? {},
                analysis_mode: 'combined',
            });
        }
    }, [open, initial]);
    const submit = async () => {
        if (!form.name.trim())
            return;
        await onSubmit(form);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: initial ? 'Editar competidor' : 'Nuevo competidor' }) }), _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Nombre *", value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })) }), _jsx(Input, { label: "Website", placeholder: "https://...", value: form.website, onChange: (e) => setForm((f) => ({ ...f, website: e.target.value })) }), _jsx(Textarea, { label: "Notas", value: form.notes, onChange: (e) => setForm((f) => ({ ...f, notes: e.target.value })) }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500", children: "Redes sociales" }), SOCIAL_NETWORKS.map((n) => (_jsx(Input, { icon: n.icon, placeholder: `URL de ${n.label}`, value: form.social_links[n.key] ?? '', onChange: (e) => setForm((f) => ({
                                        ...f,
                                        social_links: { ...f.social_links, [n.key]: e.target.value },
                                    })) }, n.key)))] }), _jsxs("div", { className: "space-y-3 pt-2 border-t border-slate-100", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500", children: "Modo de an\u00E1lisis" }), _jsx(RadioGroup, { value: form.analysis_mode, onValueChange: (v) => setForm((f) => ({ ...f, analysis_mode: v })), children: [
                                        { v: 'social', t: 'Solo redes (engagement)', d: 'Scrapea Instagram y TikTok; calcula métricas.' },
                                        { v: 'web', t: 'Solo web (mercado)', d: 'Búsqueda web + síntesis IA sin tocar redes.' },
                                        { v: 'combined', t: 'Combinado (recomendado)', d: 'Ejecuta ambos para máxima visibilidad.' },
                                    ].map((o) => (_jsxs("label", { className: "flex items-start gap-3 p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50", children: [_jsx(RadioGroupItem, { value: o.v }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-semibold text-slate-900", children: o.t }), _jsx("p", { className: "text-[11px] text-slate-500", children: o.d })] })] }, o.v))) })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }), _jsx(Button, { onClick: submit, disabled: saving || !form.name.trim(), children: saving ? _jsx(Spinner, {}) : 'Guardar' })] })] }) }));
}
