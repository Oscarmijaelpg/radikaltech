import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge, Card } from '@radikal/ui';
import { SectionTitle, SocialIcon } from './shared';
export function SocialAccountsSection({ accounts }) {
    if (!accounts || accounts.length === 0)
        return null;
    return (_jsxs(Card, { className: "p-4 sm:p-6 md:p-8 bg-gradient-to-br from-cyan-50 to-pink-50 border-white", children: [_jsx(SectionTitle, { icon: "hub", children: "Redes sociales conectadas" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3", children: accounts.map((s) => {
                    const label = s.handle || s.url || s.platform;
                    const content = (_jsxs("span", { className: "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white shadow-md border border-white hover:shadow-lg transition-all", children: [_jsx("span", { className: "w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-cyan-500 grid place-items-center text-white", children: _jsx(SocialIcon, { platform: s.platform }) }), _jsxs("span", { className: "flex flex-col", children: [_jsx("span", { className: "text-[9px] font-black uppercase tracking-widest text-slate-500", children: s.platform }), _jsx("span", { className: "text-sm font-bold text-slate-800", children: label })] }), typeof s.followers === 'number' && s.followers > 0 && (_jsxs(Badge, { variant: "muted", className: "ml-2", children: [s.followers.toLocaleString(), " seguidores"] }))] }));
                    return s.url ? (_jsx("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", children: content }, s.id)) : (_jsx("div", { children: content }, s.id));
                }) })] }));
}
