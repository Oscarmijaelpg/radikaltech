import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@radikal/ui';
import { Link } from 'react-router-dom';
import ankorProfile from '@/media/ankor_profile.webp';
import siraProfile from '@/media/sira_profile.webp';
import nexoProfile from '@/media/nexo_profile.webp';
import kronosProfile from '@/media/kronos_profile.webp';
import indexaProfile from '@/media/indexa_profile.webp';
const CHAR_IMAGES = {
    ankor: ankorProfile,
    sira: siraProfile,
    nexo: nexoProfile,
    kronos: kronosProfile,
    indexa: indexaProfile,
};
const CHAR_ACCENT = {
    ankor: 'from-pink-500 to-rose-500',
    sira: 'from-cyan-500 to-blue-500',
    nexo: 'from-amber-500 to-orange-500',
    kronos: 'from-emerald-500 to-teal-500',
    indexa: 'from-violet-500 to-fuchsia-500',
};
function resolveCharacter(c) {
    if (c === 'auto')
        return 'ankor';
    return c;
}
export function CharacterEmpty({ character, title, message, action }) {
    const key = resolveCharacter(character);
    const img = CHAR_IMAGES[key];
    const accent = CHAR_ACCENT[key];
    return (_jsxs("div", { className: "flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 py-10 md:py-14 px-6", children: [_jsx("div", { className: "animate-in fade-in slide-in-from-left-6 duration-500 shrink-0", children: _jsx("div", { className: `w-40 md:w-48 aspect-square rounded-[28px] bg-gradient-to-br ${accent} p-[3px] shadow-xl`, children: _jsx("div", { className: "w-full h-full rounded-[25px] bg-white overflow-hidden grid place-items-center", children: _jsx("img", { src: img, alt: key, className: "w-full h-full object-cover", loading: "lazy" }) }) }) }), _jsx("div", { className: "animate-in fade-in slide-in-from-right-6 duration-500 max-w-md relative", children: _jsxs("div", { className: "relative bg-white rounded-[24px] border border-slate-200 shadow-lg p-6 md:p-7", children: [_jsx("span", { "aria-hidden": true, className: "hidden md:block absolute -left-2 top-10 w-4 h-4 rotate-45 bg-white border-l border-b border-slate-200" }), _jsx("h3", { className: "font-display text-xl md:text-2xl font-black text-slate-900 mb-2", children: title }), _jsx("p", { className: "text-sm md:text-base text-slate-600 leading-relaxed", children: message }), action && (_jsx("div", { className: "mt-5", children: action.to ? (_jsx(Button, { asChild: true, children: _jsx(Link, { to: action.to, children: action.label }) })) : (_jsx(Button, { onClick: action.onClick, children: action.label })) }))] }) })] }));
}
