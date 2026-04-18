import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '@radikal/ui';
import { JOB_LABELS } from './utils';
export function ActiveJobsBanner({ jobs, }) {
    return (_jsx(Card, { className: "p-4 sm:p-5 bg-gradient-to-r from-pink-50 via-cyan-50 to-pink-50 border-[hsl(var(--color-primary)/0.3)]", children: _jsxs("div", { className: "flex items-start sm:items-center gap-3 sm:gap-4", children: [_jsx("div", { className: "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shadow-lg shrink-0", children: _jsx("span", { className: "material-symbols-outlined animate-spin text-[22px]", children: "progress_activity" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]", children: "Sira est\u00E1 trabajando" }), _jsx("p", { className: "font-display text-base sm:text-lg font-bold text-slate-900", children: jobs.length === 1
                                ? (JOB_LABELS[jobs[0].kind]?.label ?? 'Procesando...')
                                : `${jobs.length} análisis en curso` }), _jsx("div", { className: "flex flex-wrap gap-2 mt-2", children: jobs.slice(0, 6).map((j) => {
                                const meta = JOB_LABELS[j.kind] ?? { label: j.kind, icon: 'bolt' };
                                return (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 text-[11px] font-semibold text-slate-700 border border-slate-200", children: [_jsx("span", { className: "material-symbols-outlined text-[14px] text-[hsl(var(--color-primary))]", children: meta.icon }), meta.label] }, j.id));
                            }) }), _jsx("p", { className: "text-[11px] text-slate-500 mt-2", children: "Esto puede tardar hasta 30-60 segundos. Los datos aparecer\u00E1n autom\u00E1ticamente cuando est\u00E9n listos." })] })] }) }));
}
