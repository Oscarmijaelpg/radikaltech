import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Input, Textarea, RadioGroup, RadioGroupItem } from '@radikal/ui';
import { SOCIAL_PLATFORMS, SocialSource } from '@radikal/shared';
import { SocialsSchema } from '../../schemas/steps';
import { NavButtons } from '../NavButtons';
import { cn } from '@/shared/utils/cn';
import { Check, AlertCircle } from 'lucide-react';
const emptyDraft = () => ({
    source: SocialSource.URL,
    url: '',
    manual_description: '',
});
export function SocialStep({ defaultValues, onSubmit, onBack, saving }) {
    const initial = {};
    (defaultValues?.accounts ?? []).forEach((acc) => {
        initial[acc.platform] = {
            source: acc.source ?? SocialSource.URL,
            url: acc.url ?? '',
            manual_description: acc.manual_description ?? '',
        };
    });
    const [selected, setSelected] = useState(initial);
    const [errors, setErrors] = useState({});
    const toggle = (id) => {
        setSelected((prev) => {
            const next = { ...prev };
            if (next[id])
                delete next[id];
            else
                next[id] = emptyDraft();
            return next;
        });
        setErrors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };
    const updateDraft = (id, patch) => {
        setSelected((prev) => {
            const current = prev[id] ?? emptyDraft();
            return { ...prev, [id]: { ...current, ...patch } };
        });
    };
    const handleSubmit = async () => {
        const accounts = [];
        const nextErrors = {};
        for (const [platform, draft] of Object.entries(selected)) {
            if (draft.source === SocialSource.URL) {
                if (!draft.url.trim()) {
                    nextErrors[platform] = 'Ingresa una URL o cambia a descripción manual';
                    continue;
                }
                try {
                    new URL(draft.url);
                }
                catch {
                    nextErrors[platform] = 'URL inválida';
                    continue;
                }
                accounts.push({
                    platform: platform,
                    source: SocialSource.URL,
                    url: draft.url.trim(),
                    manual_description: null,
                    handle: null,
                });
            }
            else if (draft.source === SocialSource.MANUAL) {
                if (draft.manual_description.trim().length < 10) {
                    nextErrors[platform] = 'La descripción debe tener al menos 10 caracteres';
                    continue;
                }
                accounts.push({
                    platform: platform,
                    source: SocialSource.MANUAL,
                    url: null,
                    manual_description: draft.manual_description.trim(),
                    handle: null,
                });
            }
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0)
            return;
        const parsed = SocialsSchema.parse({ accounts });
        await onSubmit(parsed);
    };
    const selectedCount = Object.keys(selected).length;
    return (_jsxs("div", { className: "animate-in slide-in-from-right-10 fade-in duration-500 flex flex-col", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-2xl sm:text-3xl font-bold tracking-tight", children: "Redes sociales" }), _jsx("p", { className: "mt-2 text-[hsl(var(--color-muted))]", children: "Activa las plataformas donde tu marca tiene presencia. Todas son opcionales." })] }), _jsx("div", { className: "mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3", children: SOCIAL_PLATFORMS.map((p) => {
                    const isActive = !!selected[p.id];
                    return (_jsxs("button", { type: "button", onClick: () => toggle(p.id), "aria-pressed": isActive, className: cn('relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 sm:p-4 transition-all duration-200 min-h-[80px]', isActive
                            ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)]'
                            : 'border-[hsl(var(--color-border))] bg-white hover:border-[hsl(var(--color-primary)/0.4)]'), children: [_jsx("div", { className: "h-10 w-10 rounded-xl grid place-items-center", style: { backgroundColor: `${p.color}15` }, children: _jsx("span", { className: "text-lg font-bold", style: { color: p.color }, "aria-hidden": true, children: p.name[0] }) }), _jsx("span", { className: "text-sm font-semibold", children: p.name }), isActive && (_jsx("span", { className: "absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--color-primary))] text-white", children: _jsx(Check, { className: "h-3 w-3", strokeWidth: 3 }) }))] }, p.id));
                }) }), selectedCount > 0 && (_jsx("div", { className: "mt-8 flex flex-col gap-5", children: Object.entries(selected).map(([id, draft]) => {
                    const meta = SOCIAL_PLATFORMS.find((p) => p.id === id);
                    return (_jsxs("div", { className: "rounded-2xl border border-[hsl(var(--color-border))] bg-white/60 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "font-display text-lg font-bold", children: meta?.name }), _jsx("button", { type: "button", className: "text-xs text-[hsl(var(--color-muted))] hover:text-red-500", onClick: () => toggle(id), children: "Quitar" })] }), _jsxs(RadioGroup, { value: draft.source, onValueChange: (v) => updateDraft(id, { source: v }), className: "grid-cols-1 sm:grid-cols-2", children: [_jsxs("label", { className: "flex items-center gap-2 rounded-xl border border-[hsl(var(--color-border))] px-3 py-2 cursor-pointer", children: [_jsx(RadioGroupItem, { value: SocialSource.URL }), _jsx("span", { className: "text-sm", children: "Pegar URL" })] }), _jsxs("label", { className: "flex items-center gap-2 rounded-xl border border-[hsl(var(--color-border))] px-3 py-2 cursor-pointer", children: [_jsx(RadioGroupItem, { value: SocialSource.MANUAL }), _jsx("span", { className: "text-sm", children: "Describir manualmente" })] })] }), _jsx("div", { className: "mt-4", children: draft.source === SocialSource.URL ? (_jsx(Input, { placeholder: `https://${meta?.name.toLowerCase()}.com/tu-cuenta`, value: draft.url, onChange: (e) => updateDraft(id, { url: e.target.value }), error: errors[id] })) : (_jsx(Textarea, { placeholder: "Describe c\u00F3mo usas esta red (audiencia, tono, tipo de contenido...)", value: draft.manual_description, onChange: (e) => updateDraft(id, { manual_description: e.target.value }), error: errors[id] })) })] }, id));
                }) })), selectedCount === 0 && (_jsxs("div", { className: "mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700", children: [_jsx(AlertCircle, { className: "h-4 w-4 mt-0.5 shrink-0" }), _jsx("span", { children: "Puedes continuar sin seleccionar redes. Podr\u00E1s a\u00F1adirlas cuando quieras desde Memory." })] })), _jsx(NavButtons, { onBack: onBack, onNext: handleSubmit, nextLabel: "Continuar", loading: saving })] }));
}
