import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Textarea, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@radikal/ui';
import { X } from 'lucide-react';
import { BrandSchema } from '../../schemas/steps';
import { NavButtons } from '../NavButtons';
const TONE_OPTIONS = [
    { value: 'profesional', label: 'Profesional' },
    { value: 'cercano', label: 'Cercano' },
    { value: 'divertido', label: 'Divertido' },
    { value: 'autoritario', label: 'Autoritario' },
    { value: 'joven', label: 'Joven' },
    { value: 'lujoso', label: 'Lujoso' },
];
export function BrandStep({ defaultValues, onSubmit, onBack, saving }) {
    const { register, handleSubmit, control, setValue, watch, } = useForm({
        resolver: zodResolver(BrandSchema),
        defaultValues: {
            tone_of_voice: defaultValues?.tone_of_voice ?? '',
            target_audience: defaultValues?.target_audience ?? '',
            brand_story: defaultValues?.brand_story ?? '',
            values: defaultValues?.values ?? [],
            personality: defaultValues?.personality ?? [],
            keywords: defaultValues?.keywords ?? [],
            forbidden_words: defaultValues?.forbidden_words ?? [],
            color_palette: defaultValues?.color_palette ?? [],
            fonts: defaultValues?.fonts ?? [],
            logo_url: defaultValues?.logo_url ?? null,
        },
    });
    const values = watch('values') ?? [];
    const [valueDraft, setValueDraft] = useState('');
    const addValue = () => {
        const v = valueDraft.trim();
        if (!v)
            return;
        if (values.includes(v))
            return;
        setValue('values', [...values, v]);
        setValueDraft('');
    };
    const removeValue = (v) => {
        setValue('values', values.filter((x) => x !== v));
    };
    const onKey = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addValue();
        }
    };
    const submit = handleSubmit(async (data) => {
        const parsed = BrandSchema.parse(data);
        await onSubmit(parsed);
    });
    return (_jsxs("form", { onSubmit: submit, className: "animate-in slide-in-from-right-10 fade-in duration-500 flex flex-col", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display text-2xl sm:text-3xl font-bold tracking-tight", children: "Tu marca" }), _jsx("p", { className: "mt-2 text-[hsl(var(--color-muted))]", children: "Todo es opcional pero cada campo ayuda a que la IA suene como tu marca." })] }), _jsxs("div", { className: "mt-8 flex flex-col gap-5", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("label", { className: "text-[10px] font-black uppercase tracking-tighter opacity-50", children: "Tono de voz" }), _jsx(Controller, { control: control, name: "tone_of_voice", render: ({ field }) => (_jsxs(Select, { value: field.value ?? '', onValueChange: field.onChange, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Elige un tono" }) }), _jsx(SelectContent, { children: TONE_OPTIONS.map((t) => (_jsx(SelectItem, { value: t.value, children: t.label }, t.value))) })] })) })] }), _jsx(Textarea, { label: "Audiencia objetivo", placeholder: "\u00BFA qui\u00E9n le hablas? Edad, intereses, necesidades...", helperText: "Opcional", ...register('target_audience') }), _jsx(Textarea, { label: "Ventaja competitiva", placeholder: "\u00BFQu\u00E9 hace \u00FAnica a tu marca? \u00BFPor qu\u00E9 te eligen?", helperText: "Opcional \u2014 se guarda como parte de tu brand story", ...register('brand_story') }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("label", { className: "text-[10px] font-black uppercase tracking-tighter opacity-50", children: "Valores de marca" }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsx(Input, { placeholder: "Ej. transparencia, innovaci\u00F3n...", value: valueDraft, onChange: (e) => setValueDraft(e.target.value), onKeyDown: onKey, containerClassName: "flex-1" }), _jsx("button", { type: "button", onClick: addValue, className: "rounded-2xl bg-[hsl(var(--color-primary))] text-white px-5 py-2 sm:py-0 font-semibold hover:opacity-90 transition min-h-[44px]", children: "A\u00F1adir" })] }), values.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: values.map((v) => (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] px-3 py-1 text-sm font-medium", children: [v, _jsx("button", { type: "button", onClick: () => removeValue(v), className: "hover:opacity-70", children: _jsx(X, { className: "h-3.5 w-3.5" }) })] }, v))) }))] })] }), _jsx(NavButtons, { onBack: onBack, nextType: "submit", nextLabel: "Continuar", loading: saving })] }));
}
