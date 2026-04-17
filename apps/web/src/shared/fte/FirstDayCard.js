import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Spinner } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import { useFirstTimeProgress } from './useFirstTimeProgress';
import { FIRST_DAY_TASKS, MAX_POINTS, LEVELS } from './tasks';
import { Confetti } from './Confetti';
export const FTE_HIDDEN_KEY = 'radikal-fte-hidden';
const FTE_COMPLETED_AT_KEY = 'radikal-fte-completed-at';
const FTE_LEVEL_SEEN_KEY = 'radikal-fte-level-seen';
const FTE_CELEBRATED_KEY = 'radikal-fte-celebrated';
function isHidden() {
    try {
        if (window.localStorage.getItem(FTE_HIDDEN_KEY) === '1')
            return true;
        const completedAt = window.localStorage.getItem(FTE_COMPLETED_AT_KEY);
        if (completedAt) {
            const t = Number(completedAt);
            if (!Number.isNaN(t) && Date.now() - t > 24 * 60 * 60 * 1000)
                return true;
        }
    }
    catch {
        /* ignore */
    }
    return false;
}
export function FirstDayCard() {
    const navigate = useNavigate();
    const { activeProject } = useProject();
    const { toast } = useToast();
    const { loading, progress, completedIds, totalTasks, completedTasks, totalPoints, level, nextTaskId, allCompleted } = useFirstTimeProgress(activeProject?.id);
    const [hidden, setHidden] = useState(() => isHidden());
    const [showFinalConfetti, setShowFinalConfetti] = useState(false);
    const [showFinalOverlay, setShowFinalOverlay] = useState(false);
    // Level-up toast + easter egg (100 points)
    useEffect(() => {
        if (!progress)
            return;
        try {
            const seenLabel = window.localStorage.getItem(FTE_LEVEL_SEEN_KEY);
            if (seenLabel !== level.label) {
                if (seenLabel !== null) {
                    // Not the very first visit — celebrate a new level unlock
                    toast({
                        title: `Nuevo nivel: ${level.label} ${level.emoji}`,
                        description: 'Sigue completando pasos para desbloquear más.',
                        variant: 'success',
                    });
                }
                window.localStorage.setItem(FTE_LEVEL_SEEN_KEY, level.label);
            }
            if (totalPoints >= MAX_POINTS) {
                const celebrated = window.localStorage.getItem(FTE_CELEBRATED_KEY);
                if (!celebrated) {
                    window.localStorage.setItem(FTE_CELEBRATED_KEY, '1');
                    setShowFinalConfetti(true);
                    setShowFinalOverlay(true);
                }
            }
            if (allCompleted && !window.localStorage.getItem(FTE_COMPLETED_AT_KEY)) {
                window.localStorage.setItem(FTE_COMPLETED_AT_KEY, String(Date.now()));
            }
        }
        catch {
            /* ignore */
        }
    }, [progress, level.label, level.emoji, totalPoints, allCompleted, toast]);
    const orderedTasks = useMemo(() => FIRST_DAY_TASKS, []);
    if (hidden || !activeProject)
        return null;
    const handleHide = () => {
        try {
            window.localStorage.setItem(FTE_HIDDEN_KEY, '1');
        }
        catch {
            /* ignore */
        }
        setHidden(true);
    };
    const progressPct = MAX_POINTS > 0 ? Math.min(100, Math.round((totalPoints / MAX_POINTS) * 100)) : 0;
    return (_jsxs(_Fragment, { children: [showFinalConfetti && (_jsx(Confetti, { durationMs: 3000, onDone: () => setShowFinalConfetti(false) })), _jsxs(Card, { className: "relative overflow-hidden p-6 md:p-7 bg-gradient-to-br from-pink-50 via-white to-cyan-50 border-2 border-pink-100", children: [_jsx("div", { className: "absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-pink-400/20 to-cyan-400/20 blur-3xl pointer-events-none" }), _jsxs("div", { className: "relative flex items-start justify-between gap-4 mb-5", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-pink-600 mb-1", children: "Tu primer d\u00EDa en Radikal" }), _jsx("h3", { className: "font-display font-black text-xl md:text-2xl text-slate-900", children: "Sigue estos pasos y despega tu marca" }), _jsx("p", { className: "text-sm text-slate-500 mt-1", children: loading
                                            ? 'Calculando tu progreso...'
                                            : `${completedTasks}/${totalTasks} completadas · ${totalPoints} puntos` })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsxs("span", { className: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${level.color} text-white text-xs font-black shadow-md`, children: [_jsx("span", { children: level.emoji }), _jsx("span", { children: level.label })] }), _jsx("button", { type: "button", onClick: handleHide, className: "text-[11px] font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded", children: "Ocultar" })] })] }), _jsx("div", { className: "relative h-3 rounded-full bg-slate-100 overflow-hidden mb-6", children: _jsx("div", { className: "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] transition-all duration-700", style: { width: `${progressPct}%` } }) }), loading ? (_jsx("div", { className: "py-8 grid place-items-center", children: _jsx(Spinner, {}) })) : (_jsx("ul", { className: "space-y-2", children: orderedTasks.map((task) => {
                            const isDone = completedIds.has(task.id);
                            const isCurrent = !isDone && task.id === nextTaskId;
                            return (_jsxs("li", { className: [
                                    'relative flex items-center gap-3 p-3 md:p-4 rounded-2xl transition-all',
                                    isDone
                                        ? 'bg-emerald-50/60 border border-emerald-100'
                                        : isCurrent
                                            ? 'bg-white border border-pink-200 ring-2 ring-pink-300/40 shadow-md'
                                            : 'bg-white/60 border border-slate-100 opacity-60',
                                ].join(' '), children: [_jsx("div", { className: [
                                            'w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white',
                                            isDone
                                                ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                                : isCurrent
                                                    ? 'bg-gradient-to-br from-pink-500 to-rose-500'
                                                    : 'bg-gradient-to-br from-slate-300 to-slate-400',
                                        ].join(' '), children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: isDone ? 'check' : task.icon }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: [
                                                    'text-sm font-bold truncate',
                                                    isDone ? 'text-emerald-700 line-through' : 'text-slate-900',
                                                ].join(' '), children: task.title }), _jsxs("p", { className: "text-xs text-slate-500 truncate", children: [task.description, isCurrent && (_jsxs("span", { className: "ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600", children: [_jsx("span", { className: "material-symbols-outlined text-[12px]", children: "schedule" }), "~", task.estimatedMinutes, " min"] }))] })] }), _jsxs("div", { className: "shrink-0 text-[11px] font-black text-slate-400", children: ["+", task.points] }), isCurrent && (_jsxs(Button, { size: "sm", onClick: () => navigate(task.cta.to), children: [task.cta.label, _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "arrow_forward" })] }))] }, task.id));
                        }) }))] }), showFinalOverlay && (_jsx("div", { className: "fixed inset-0 z-[10000] grid place-items-center bg-black/50 backdrop-blur-sm p-4", children: _jsxs(Card, { className: "relative max-w-lg w-full p-8 text-center bg-gradient-to-br from-pink-50 via-white to-cyan-50", children: [_jsx("div", { className: "text-5xl mb-3", children: "\uD83C\uDF89" }), _jsx("h3", { className: "font-display font-black text-2xl text-slate-900 mb-2", children: "\u00A1Enhorabuena! Has completado tu primer d\u00EDa" }), _jsxs("p", { className: "text-sm text-slate-600 mb-4", children: ["Desbloqueaste el nivel", ' ', _jsxs("span", { className: "font-bold", children: [LEVELS[LEVELS.length - 1].label, " ", LEVELS[LEVELS.length - 1].emoji] }), ". Ahora tu marca est\u00E1 lista para crecer de verdad."] }), _jsx(Button, { onClick: () => setShowFinalOverlay(false), children: "Cerrar" })] }) }))] }));
}
