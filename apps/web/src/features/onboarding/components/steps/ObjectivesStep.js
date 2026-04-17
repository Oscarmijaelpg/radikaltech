import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Input, Textarea, Button } from '@radikal/ui';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { ObjectivesSchema } from '../../schemas/steps';
import { NavButtons } from '../NavButtons';
const emptyDraft = () => ({ title: '', description: '', target_date: '' });
export function ObjectivesStep({ defaultValues, onSubmit, onBack, saving, brandCompleted, onSuggestWithAI, }) {
    const initial = defaultValues?.objectives && defaultValues.objectives.length > 0
        ? defaultValues.objectives.map((o) => ({
            title: o.title,
            description: o.description ?? '',
            target_date: o.target_date ?? '',
        }))
        : [emptyDraft()];
    const [items, setItems] = useState(initial);
    const [errors, setErrors] = useState({});
    const [suggesting, setSuggesting] = useState(false);
    const addItem = () => {
        if (items.length >= 5)
            return;
        setItems([...items, emptyDraft()]);
    };
    const removeItem = (idx) => {
        if (items.length === 1)
            return;
        setItems(items.filter((_, i) => i !== idx));
    };
    const update = (idx, patch) => {
        setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    };
    const handleSuggest = async () => {
        if (!onSuggestWithAI)
            return;
        setSuggesting(true);
        try {
            const suggestions = await onSuggestWithAI();
            if (suggestions && suggestions.length > 0) {
                setItems(suggestions.slice(0, 5).map((s) => ({
                    title: s.title,
                    description: s.description ?? '',
                    target_date: '',
                })));
            }
        }
        finally {
            setSuggesting(false);
        }
    };
    const handleSubmit = async () => {
        const nextErrors = {};
        const valid = items.filter((it, i) => {
            if (!it.title.trim()) {
                nextErrors[i] = 'El título es obligatorio';
                return false;
            }
            return true;
        });
        if (valid.length === 0) {
            nextErrors[0] = 'Define al menos un objetivo';
            setErrors(nextErrors);
            return;
        }
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        setErrors({});
        const payload = ObjectivesSchema.parse({
            objectives: valid.map((it, idx) => ({
                title: it.title.trim(),
                description: it.description.trim() || null,
                priority: idx,
                target_date: it.target_date ? new Date(it.target_date).toISOString() : null,
            })),
        });
        await onSubmit(payload);
    };
    return (_jsxs("div", { className: "animate-in slide-in-from-right-10 fade-in duration-500 flex flex-col", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-2xl sm:text-3xl font-bold tracking-tight", children: "Tus objetivos" }), _jsx("p", { className: "mt-2 text-[hsl(var(--color-muted))]", children: "Define de 1 a 5 objetivos. La IA los usar\u00E1 como norte para todo lo que cree." })] }), brandCompleted && onSuggestWithAI && (_jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: handleSuggest, disabled: suggesting, children: [_jsx(Sparkles, { className: "h-4 w-4" }), suggesting ? 'Sugiriendo...' : 'Sugerir con IA'] }))] }), _jsxs("div", { className: "mt-8 flex flex-col gap-4", children: [items.map((item, idx) => (_jsxs("div", { className: "rounded-2xl border border-[hsl(var(--color-border))] bg-white/60 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("span", { className: "text-sm font-bold text-[hsl(var(--color-primary))]", children: ["Objetivo ", idx + 1] }), items.length > 1 && (_jsx("button", { type: "button", onClick: () => removeItem(idx), className: "text-slate-400 hover:text-red-500 transition", "aria-label": "Eliminar objetivo", children: _jsx(Trash2, { className: "h-4 w-4" }) }))] }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(Input, { label: "T\u00EDtulo", placeholder: "Ej. Crecer 30% en ventas online", value: item.title, onChange: (e) => update(idx, { title: e.target.value }), error: errors[idx] }), _jsx(Textarea, { label: "Descripci\u00F3n", placeholder: "Detalles, m\u00E9tricas, contexto (opcional)", value: item.description, onChange: (e) => update(idx, { description: e.target.value }) }), _jsx(Input, { label: "Fecha objetivo", type: "date", value: item.target_date ? item.target_date.substring(0, 10) : '', onChange: (e) => update(idx, { target_date: e.target.value }), helperText: "Opcional" })] })] }, idx))), items.length < 5 && (_jsxs("button", { type: "button", onClick: addItem, className: "rounded-2xl border-2 border-dashed border-[hsl(var(--color-border))] p-4 text-sm font-semibold text-[hsl(var(--color-muted))] hover:border-[hsl(var(--color-primary))] hover:text-[hsl(var(--color-primary))] transition flex items-center justify-center gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), "A\u00F1adir objetivo"] }))] }), _jsx(NavButtons, { onBack: onBack, onNext: handleSubmit, nextLabel: "Finalizar", loading: saving })] }));
}
