import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';
const TABS = [
    { to: '/news', label: 'Noticias', icon: 'newspaper' },
    { to: '/reports', label: 'Reportes', icon: 'assignment' },
    { to: '/recommendations', label: 'Sugerencias', icon: 'tips_and_updates', badge: 'IA' },
];
export function AnalysisSubnav() {
    return (_jsx("div", { className: "sticky top-0 z-20 -mx-6 md:-mx-8 px-6 md:px-8 pt-2 pb-3 bg-[hsl(var(--color-bg))]/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-[hsl(var(--color-border))] mb-6", children: _jsx("div", { className: "flex items-center gap-1 overflow-x-auto no-scrollbar", children: TABS.map((t) => (_jsxs(NavLink, { to: t.to, end: true, className: ({ isActive }) => cn('inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap', isActive
                    ? 'bg-[hsl(var(--color-primary))] text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary)/0.4)]'), children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: t.icon }), t.label, t.badge && (_jsx("span", { className: "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/20", children: t.badge }))] }, t.to))) }) }));
}
