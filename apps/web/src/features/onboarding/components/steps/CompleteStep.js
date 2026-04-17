import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Spinner } from '@radikal/ui';
import { AlertCircle } from 'lucide-react';
import { WebsiteSource } from '@radikal/shared';
import ankorImg from '@/media/ankor.webp';
import siraImg from '@/media/Sira.webp';
import nexoImg from '@/media/Nexo.webp';
import kronosImg from '@/media/Kronos.webp';
import indexaImg from '@/media/indexa.webp';
const CHARACTERS = [
    { src: ankorImg, name: 'Ankor' },
    { src: siraImg, name: 'Sira' },
    { src: nexoImg, name: 'Nexo' },
    { src: kronosImg, name: 'Kronos' },
    { src: indexaImg, name: 'Indexa' },
];
export function CompleteStep({ state, onFinish }) {
    const [finishing, setFinishing] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        // ensure no scroll flicker
    }, []);
    const websiteConfigured = state.company?.website_source === WebsiteSource.URL ||
        (state.company?.business_summary && state.company.business_summary.length > 0);
    const socialsConfigured = (state.socials?.accounts?.length ?? 0) > 0;
    const brandConfigured = !!state.brand?.tone_of_voice;
    const objectivesCount = state.objectives?.objectives?.length ?? 0;
    const hasWarnings = !websiteConfigured || !socialsConfigured;
    const handleFinish = async () => {
        setError(null);
        setFinishing(true);
        try {
            await onFinish();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'No pudimos finalizar. Intenta de nuevo.');
            setFinishing(false);
        }
    };
    return (_jsxs("div", { className: "animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center text-center gap-4 sm:gap-6 py-4 sm:py-6", children: [_jsx("div", { className: "h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center shadow-xl shadow-emerald-500/40 animate-in zoom-in-50 duration-500", children: _jsx("span", { className: "material-symbols-outlined text-white text-5xl", style: { fontVariationSettings: "'FILL' 1" }, children: "check_circle" }) }), _jsxs("div", { className: "max-w-xl", children: [_jsx("h2", { className: "font-display text-3xl sm:text-4xl font-bold tracking-tight", children: "\u00A1Todo listo!" }), _jsx("p", { className: "mt-3 text-[hsl(var(--color-muted))]", children: "Radikal ya tiene el contexto necesario para trabajar como tu socio estrat\u00E9gico." })] }), _jsxs("div", { className: "w-full max-w-md text-left bg-slate-50 rounded-2xl p-4 sm:p-5 flex flex-col gap-2", children: [_jsx(SummaryRow, { label: "Empresa", value: state.company?.company_name ?? '—' }), _jsx(SummaryRow, { label: "Industria", value: state.company?.industry_custom || state.company?.industry || '—' }), _jsx(SummaryRow, { label: "Sitio web", value: state.company?.website_source === WebsiteSource.URL
                            ? state.company?.website_url ?? 'Configurado'
                            : state.company?.business_summary
                                ? 'Descrito manualmente'
                                : 'Omitido' }), _jsx(SummaryRow, { label: "Redes sociales", value: `${state.socials?.accounts?.length ?? 0} conectadas` }), _jsx(SummaryRow, { label: "Tono de voz", value: state.brand?.tone_of_voice || 'No definido' }), _jsx(SummaryRow, { label: "Objetivos", value: `${objectivesCount} definidos` })] }), hasWarnings && (_jsxs("div", { className: "w-full max-w-md flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 text-left", children: [_jsx(AlertCircle, { className: "h-4 w-4 mt-0.5 shrink-0" }), _jsx("span", { children: "Completar estos datos mejora la IA. Podr\u00E1s hacerlo despu\u00E9s desde la secci\u00F3n Memory." })] })), error && (_jsxs("div", { className: "w-full max-w-md flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-900 text-left", children: [_jsx(AlertCircle, { className: "h-4 w-4 mt-0.5 shrink-0" }), _jsx("span", { children: error })] })), _jsxs(Button, { size: "lg", onClick: handleFinish, disabled: finishing, className: "mt-2", children: [finishing ? (_jsx(Spinner, { size: "sm", className: "border-white border-t-white/40" })) : null, "Entrar al dashboard", !finishing && _jsx("span", { className: "material-symbols-outlined text-[20px]", children: "arrow_forward" })] }), _jsx("div", { className: "w-full flex items-end justify-center gap-2 md:gap-4 mt-6 pt-6 border-t border-slate-100", children: CHARACTERS.map((c, i) => (_jsxs("div", { className: "flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700", style: { animationDelay: `${i * 100}ms` }, children: [_jsx("img", { src: c.src, alt: c.name, className: "w-16 md:w-20 drop-shadow-xl object-contain" }), _jsx("span", { className: "text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-600", children: c.name })] }, c.name))) })] }));
}
function SummaryRow({ label, value }) {
    return (_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-[hsl(var(--color-muted))]", children: label }), _jsx("span", { className: "font-semibold text-right truncate max-w-[60%]", children: value })] }));
}
