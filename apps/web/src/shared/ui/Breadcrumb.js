import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
export function Breadcrumb({ items, className }) {
    return (_jsx("nav", { "aria-label": "Breadcrumb", className: className ??
            'flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400', children: _jsx("ol", { className: "flex items-center gap-1 flex-wrap", children: items.map((item, i) => {
                const isLast = i === items.length - 1;
                const content = (_jsx("span", { className: isLast
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'hover:text-[hsl(var(--color-primary))] transition-colors', children: item.label }));
                return (_jsxs("li", { className: "flex items-center gap-1", children: [!isLast && item.to ? (_jsx(Link, { to: item.to, className: "inline-flex items-center", children: content })) : !isLast && item.onClick ? (_jsx("button", { type: "button", onClick: item.onClick, className: "inline-flex items-center", children: content })) : (content), !isLast && (_jsx("span", { className: "material-symbols-outlined text-[14px] opacity-50", children: "chevron_right" }))] }, i));
            }) }) }));
}
