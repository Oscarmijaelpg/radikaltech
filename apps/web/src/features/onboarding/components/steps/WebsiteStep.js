import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea, OptionCard, Button, Spinner } from '@radikal/ui';
import { Globe, PenLine, SkipForward, Sparkles, AlertCircle } from 'lucide-react';
import { WebsiteSource } from '@radikal/shared';
import { CompanySchema } from '../../schemas/steps';
import { NavButtons } from '../NavButtons';
import { useAnalyzeWebsite } from '../../hooks/useAnalyzeWebsite';
const urlFormSchema = z.object({
    website_url: z.string().url('Ingresa una URL válida (https://...)'),
    business_summary: z.string().optional(),
    main_products: z.string().optional(),
    ideal_customer: z.string().optional(),
    unique_value: z.string().optional(),
});
const manualFormSchema = z.object({
    business_summary: z
        .string()
        .trim()
        .min(20, 'Cuéntanos al menos 20 caracteres sobre tu negocio'),
    main_products: z
        .string()
        .trim()
        .min(10, 'Describe tus productos con al menos 10 caracteres'),
    ideal_customer: z.string().optional(),
    unique_value: z.string().optional(),
});
export function WebsiteStep({ defaultValues, onSubmit, onBack, saving }) {
    const initialMode = defaultValues.website_source === WebsiteSource.URL
        ? 'url'
        : defaultValues.website_source === WebsiteSource.MANUAL
            ? 'manual'
            : 'none';
    const [mode, setMode] = useState(initialMode);
    const [skipConfirmed, setSkipConfirmed] = useState(initialMode === 'none' && !defaultValues.business_summary);
    const analyze = useAnalyzeWebsite();
    const [analyzeError, setAnalyzeError] = useState(null);
    const urlForm = useForm({
        resolver: zodResolver(urlFormSchema),
        defaultValues: {
            website_url: defaultValues.website_url ?? '',
            business_summary: defaultValues.business_summary ?? '',
            main_products: defaultValues.main_products ?? '',
            ideal_customer: defaultValues.ideal_customer ?? '',
            unique_value: defaultValues.unique_value ?? '',
        },
    });
    const manualForm = useForm({
        resolver: zodResolver(manualFormSchema),
        defaultValues: {
            business_summary: defaultValues.business_summary ?? '',
            main_products: defaultValues.main_products ?? '',
            ideal_customer: defaultValues.ideal_customer ?? '',
            unique_value: defaultValues.unique_value ?? '',
        },
    });
    const handleAnalyze = async () => {
        setAnalyzeError(null);
        const url = urlForm.getValues('website_url');
        const check = urlForm.trigger('website_url');
        if (!(await check))
            return;
        try {
            const result = await analyze.mutateAsync(url);
            if (result.business_summary)
                urlForm.setValue('business_summary', result.business_summary);
            if (result.main_products)
                urlForm.setValue('main_products', result.main_products);
            if (result.ideal_customer)
                urlForm.setValue('ideal_customer', result.ideal_customer);
            if (result.unique_value)
                urlForm.setValue('unique_value', result.unique_value);
        }
        catch (e) {
            setAnalyzeError(e instanceof Error ? e.message : 'No pudimos analizar el sitio. Puedes continuar igual.');
        }
    };
    const submitUrl = urlForm.handleSubmit(async (values) => {
        const full = CompanySchema.parse({
            company_name: defaultValues.company_name,
            industry: defaultValues.industry,
            industry_custom: defaultValues.industry_custom ?? null,
            website_source: WebsiteSource.URL,
            website_url: values.website_url,
            website_manual_description: null,
            business_summary: values.business_summary || null,
            ideal_customer: values.ideal_customer || null,
            unique_value: values.unique_value || null,
            main_products: values.main_products || null,
            additional_context: defaultValues.additional_context ?? null,
        });
        await onSubmit(full);
    });
    const submitManual = manualForm.handleSubmit(async (values) => {
        const full = CompanySchema.parse({
            company_name: defaultValues.company_name,
            industry: defaultValues.industry,
            industry_custom: defaultValues.industry_custom ?? null,
            website_source: WebsiteSource.MANUAL,
            website_url: null,
            website_manual_description: null,
            business_summary: values.business_summary,
            ideal_customer: values.ideal_customer || null,
            unique_value: values.unique_value || null,
            main_products: values.main_products,
            additional_context: defaultValues.additional_context ?? null,
        });
        await onSubmit(full);
    });
    const submitSkip = async () => {
        const full = CompanySchema.parse({
            company_name: defaultValues.company_name,
            industry: defaultValues.industry,
            industry_custom: defaultValues.industry_custom ?? null,
            website_source: WebsiteSource.NONE,
            website_url: null,
            website_manual_description: null,
            business_summary: null,
            ideal_customer: null,
            unique_value: null,
            main_products: null,
            additional_context: null,
        });
        await onSubmit(full);
    };
    return (_jsxs("div", { className: "animate-in slide-in-from-right-10 fade-in duration-500 flex flex-col relative", children: [analyze.isPending && (_jsxs("div", { className: "absolute inset-0 -m-4 md:-m-6 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4 rounded-3xl animate-in fade-in duration-300 p-6", children: [_jsx(Spinner, { size: "lg" }), _jsx("p", { className: "text-sm font-bold text-slate-700 uppercase tracking-widest", children: "Mapeando tu sitio..." }), _jsx("p", { className: "text-xs text-slate-500 text-center max-w-xs", children: "Sira est\u00E1 analizando con IA. Esto puede tardar hasta 30 segundos." }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => analyze.reset(), className: "mt-2", children: "Cancelar y continuar manual" })] })), _jsxs("div", { children: [_jsx("h2", { className: "font-display text-2xl sm:text-3xl font-bold tracking-tight", children: "Tu presencia digital" }), _jsx("p", { className: "mt-2 text-[hsl(var(--color-muted))]", children: "Elige c\u00F3mo quieres compartir informaci\u00F3n de tu negocio. Todo es opcional." })] }), _jsxs("div", { className: "mt-6 sm:mt-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3", children: [_jsx(OptionCard, { icon: _jsx(Globe, { className: "h-5 w-5" }), title: "Tengo sitio web", description: "Analizamos tu sitio con IA", selected: mode === 'url', onClick: () => setMode('url') }), _jsx(OptionCard, { icon: _jsx(PenLine, { className: "h-5 w-5" }), title: "No tengo sitio", description: "Cu\u00E9ntanos en pocas palabras", selected: mode === 'manual', onClick: () => setMode('manual') }), _jsx(OptionCard, { icon: _jsx(SkipForward, { className: "h-5 w-5" }), title: "Prefiero omitir", description: "Puedes completarlo despu\u00E9s", selected: mode === 'none', onClick: () => {
                            setMode('none');
                            setSkipConfirmed(true);
                        } })] }), mode === 'url' && (_jsxs("form", { onSubmit: submitUrl, className: "mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-5", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-end gap-3", children: [_jsx("div", { className: "flex-1", children: _jsx(Input, { label: "URL de tu sitio web", placeholder: "https://tunegocio.com", error: urlForm.formState.errors.website_url?.message, ...urlForm.register('website_url') }) }), _jsxs(Button, { type: "button", variant: "secondary", onClick: handleAnalyze, disabled: analyze.isPending, className: "sm:mb-[2px] w-full sm:w-auto min-h-[44px]", children: [analyze.isPending ? (_jsx(Spinner, { size: "sm", className: "border-white border-t-white/40" })) : (_jsx(Sparkles, { className: "h-4 w-4" })), "Analizar con IA"] })] }), analyzeError && (_jsxs("div", { className: "flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900", children: [_jsx(AlertCircle, { className: "h-4 w-4 mt-0.5 shrink-0" }), _jsx("span", { children: analyzeError })] })), _jsx(Textarea, { label: "Resumen del negocio", placeholder: "Se completar\u00E1 al analizar tu sitio (o escr\u00EDbelo t\u00FA)", helperText: "Opcional", ...urlForm.register('business_summary') }), _jsx(Textarea, { label: "Productos o servicios principales", helperText: "Opcional", ...urlForm.register('main_products') }), _jsx(Textarea, { label: "Cliente ideal", helperText: "Opcional", ...urlForm.register('ideal_customer') }), _jsx(Textarea, { label: "Propuesta \u00FAnica de valor", helperText: "Opcional", ...urlForm.register('unique_value') }), _jsx(NavButtons, { onBack: onBack, nextType: "submit", nextLabel: "Continuar", loading: saving })] })), mode === 'manual' && (_jsxs("form", { onSubmit: submitManual, className: "mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-5", children: [_jsx(Textarea, { label: "Resumen del negocio", placeholder: "\u00BFA qu\u00E9 se dedica tu empresa? (m\u00EDnimo 20 caracteres)", error: manualForm.formState.errors.business_summary?.message, ...manualForm.register('business_summary') }), _jsx(Textarea, { label: "Productos o servicios principales", placeholder: "Lista tus principales productos/servicios", error: manualForm.formState.errors.main_products?.message, ...manualForm.register('main_products') }), _jsx(Textarea, { label: "Cliente ideal", helperText: "Opcional \u2014 \u00BFqui\u00E9n es tu buyer persona?", ...manualForm.register('ideal_customer') }), _jsx(Textarea, { label: "Propuesta \u00FAnica de valor", helperText: "Opcional \u2014 \u00BFqu\u00E9 te hace diferente?", ...manualForm.register('unique_value') }), _jsx(NavButtons, { onBack: onBack, nextType: "submit", nextLabel: "Continuar", loading: saving })] })), mode === 'none' && (_jsxs("div", { className: "mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300", children: [skipConfirmed && (_jsxs("div", { className: "flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-5 text-sm text-amber-900", children: [_jsx(AlertCircle, { className: "h-5 w-5 mt-0.5 shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "Esta informaci\u00F3n mejora la IA" }), _jsx("p", { className: "mt-1 opacity-80", children: "Puedes continuar, pero te recomendamos completar al menos una breve descripci\u00F3n para que la IA trabaje mejor. Podr\u00E1s a\u00F1adirlo en cualquier momento desde Memory." })] })] })), _jsxs("div", { className: "pt-8 mt-8 border-t border-[hsl(var(--color-border))] flex items-center justify-between", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onBack, disabled: saving, children: "Atr\u00E1s" }), _jsxs(Button, { type: "button", onClick: submitSkip, disabled: saving, children: [saving ? _jsx(Spinner, { size: "sm", className: "border-white border-t-white/40" }) : null, "Continuar igual"] })] })] }))] }));
}
