import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@radikal/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { useFirstTimeProgress } from './useFirstTimeProgress';
import { FIRST_DAY_TASKS } from './tasks';
import { FTE_HIDDEN_KEY } from './FirstDayCard';
import onboardingVideo from '@/media/onboarding.mp4';
export const WELCOME_SEEN_KEY = 'radikal-welcome-seen';
export function WelcomeModal() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const { activeProject } = useProject();
    const { completedIds } = useFirstTimeProgress(activeProject?.id);
    const [open, setOpen] = useState(() => {
        try {
            if (window.localStorage.getItem(WELCOME_SEEN_KEY) === '1')
                return false;
        }
        catch {
            /* ignore */
        }
        return true;
    });
    // Only show after onboarding is completed.
    useEffect(() => {
        if (!profile?.onboarding_completed)
            setOpen(false);
    }, [profile?.onboarding_completed]);
    const nextThree = useMemo(() => FIRST_DAY_TASKS.filter((t) => !completedIds.has(t.id)).slice(0, 3), [completedIds]);
    if (!open || !profile?.onboarding_completed)
        return null;
    const firstName = profile.full_name?.split(' ')[0] ?? 'bienvenido';
    const persistSeen = () => {
        try {
            window.localStorage.setItem(WELCOME_SEEN_KEY, '1');
        }
        catch {
            /* ignore */
        }
    };
    const handleStart = () => {
        persistSeen();
        try {
            window.localStorage.removeItem(FTE_HIDDEN_KEY);
        }
        catch {
            /* ignore */
        }
        setOpen(false);
    };
    const handleExplore = () => {
        persistSeen();
        try {
            window.localStorage.setItem(FTE_HIDDEN_KEY, '1');
        }
        catch {
            /* ignore */
        }
        setOpen(false);
    };
    return (_jsx("div", { className: "fixed inset-0 z-[10000] grid place-items-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto", children: _jsxs("div", { className: "relative w-full max-w-3xl rounded-3xl bg-gradient-to-br from-pink-50 via-white to-cyan-50 shadow-2xl border border-white/80 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300", children: [_jsx("div", { className: "absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-pink-300/30 to-cyan-300/30 blur-3xl pointer-events-none" }), _jsxs("div", { className: "relative p-6 md:p-10", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-center gap-6 mb-8", children: [_jsx("video", { src: onboardingVideo, width: 320, height: 180, autoPlay: true, muted: true, loop: true, playsInline: true, className: "rounded-2xl shadow-lg w-full md:w-[320px] aspect-video object-cover bg-black" }), _jsxs("div", { className: "flex-1 min-w-0 text-center md:text-left", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-pink-600 mb-2", children: "Bienvenida" }), _jsxs("h2", { className: "font-display font-black text-3xl md:text-4xl text-slate-900 leading-tight", children: ["\u00A1Bienvenido a Radikal, ", firstName, "!"] }), _jsx("p", { className: "text-slate-600 mt-3 text-base md:text-lg", children: "Has completado lo b\u00E1sico. Ahora vamos a hacer que tu marca brille." })] })] }), nextThree.length > 0 && (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3", children: "Tus primeros pasos" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 mb-8", children: nextThree.map((t) => (_jsxs("div", { className: "p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-2", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 grid place-items-center text-white shadow-md", children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: t.icon }) }), _jsx("p", { className: "text-sm font-bold text-slate-900", children: t.title }), _jsx("p", { className: "text-[11px] text-slate-500 line-clamp-2", children: t.description }), _jsxs("span", { className: "text-[11px] font-semibold text-pink-600 inline-flex items-center gap-1 mt-auto", children: [_jsx("span", { className: "material-symbols-outlined text-[13px]", children: "schedule" }), "~", t.estimatedMinutes, " min"] })] }, t.id))) })] })), _jsxs("div", { className: "flex flex-col-reverse md:flex-row gap-3 justify-end", children: [_jsx(Button, { variant: "outline", onClick: handleExplore, children: "Explorar solo" }), _jsxs(Button, { onClick: () => {
                                        handleStart();
                                        if (nextThree[0])
                                            navigate(nextThree[0].cta.to);
                                    }, children: ["Empezar", _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "arrow_forward" })] })] })] })] }) }));
}
