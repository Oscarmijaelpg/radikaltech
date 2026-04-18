import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '@radikal/ui';
import { SectionTitle } from './shared';
export function BusinessSummarySection({ project }) {
    if (!project?.business_summary)
        return null;
    return (_jsxs(Card, { className: "p-4 sm:p-6 md:p-8 bg-white border-white", children: [_jsx(SectionTitle, { icon: "business", children: "Sobre el negocio" }), _jsx("p", { className: "text-sm md:text-base text-slate-700 font-medium leading-relaxed whitespace-pre-wrap", children: project.business_summary }), project.additional_context && (_jsxs("div", { className: "mt-4 pt-4 border-t border-slate-100", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2", children: "Contexto adicional" }), _jsx("p", { className: "text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap", children: project.additional_context })] }))] }));
}
