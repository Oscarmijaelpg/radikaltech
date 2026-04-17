import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function EmptyHero({ icon, title, description, action }) {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center text-center py-16 px-6", children: [_jsx("div", { className: "h-20 w-20 rounded-3xl bg-slate-100 grid place-items-center mb-5", children: _jsx("span", { className: "material-symbols-outlined text-slate-500", style: { fontSize: '40px' }, children: icon }) }), _jsx("h3", { className: "font-display text-xl md:text-2xl font-semibold mb-2", children: title }), description && (_jsx("p", { className: "text-sm text-slate-500 max-w-md mb-5", children: description })), action && _jsx("div", { children: action })] }));
}
