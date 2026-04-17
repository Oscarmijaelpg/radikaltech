import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, } from 'react';
const TourContext = createContext(null);
export const TOUR_STORAGE_KEY = 'radikal-tour-completed';
export function useTour() {
    const ctx = useContext(TourContext);
    if (!ctx)
        throw new Error('useTour debe usarse dentro de <TourProvider>');
    return ctx;
}
function getRect(selector) {
    if (typeof document === 'undefined')
        return null;
    const el = document.querySelector(selector);
    if (!el)
        return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
}
function Tooltip({ rect, step, index, total, onNext, onSkip }) {
    const placement = step.placement ?? 'right';
    const margin = 16;
    let top = 0;
    let left = 0;
    const tooltipW = 320;
    const tooltipH = 180;
    switch (placement) {
        case 'top':
            top = rect.top - tooltipH - margin;
            left = rect.left + rect.width / 2 - tooltipW / 2;
            break;
        case 'bottom':
            top = rect.top + rect.height + margin;
            left = rect.left + rect.width / 2 - tooltipW / 2;
            break;
        case 'left':
            top = rect.top + rect.height / 2 - tooltipH / 2;
            left = rect.left - tooltipW - margin;
            break;
        case 'right':
        default:
            top = rect.top + rect.height / 2 - tooltipH / 2;
            left = rect.left + rect.width + margin;
            break;
    }
    // Clamp a la ventana
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    left = Math.max(12, Math.min(left, vw - tooltipW - 12));
    top = Math.max(12, Math.min(top, vh - tooltipH - 12));
    const isLast = index === total - 1;
    return (_jsxs("div", { role: "dialog", "aria-label": step.title, className: "fixed z-[60] w-[320px] rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 animate-in fade-in zoom-in-95 duration-200", style: { top, left }, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("p", { className: "text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]", children: ["Paso ", index + 1, " de ", total] }), _jsx("button", { type: "button", onClick: onSkip, className: "text-xs text-slate-400 hover:text-slate-700 font-semibold", children: "Saltar" })] }), _jsx("h4", { className: "font-display font-black text-lg text-slate-900 mb-1", children: step.title }), _jsx("p", { className: "text-sm text-slate-600 leading-snug mb-4", children: step.description }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: onNext, className: "px-4 py-2 rounded-xl bg-[hsl(var(--color-primary))] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all", children: isLast ? 'Terminar' : 'Siguiente' }) })] }));
}
export function TourProvider({ children }) {
    const [steps, setSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [visible, setVisible] = useState(false);
    const [rect, setRect] = useState(null);
    const rafRef = useRef(null);
    const step = steps[currentStep];
    const updateRect = useCallback(() => {
        if (!step)
            return;
        const r = getRect(step.target);
        setRect(r);
    }, [step]);
    useLayoutEffect(() => {
        if (!visible || !step)
            return;
        updateRect();
        const onResize = () => updateRect();
        const tick = () => {
            updateRect();
            rafRef.current = window.requestAnimationFrame(tick);
        };
        rafRef.current = window.requestAnimationFrame(tick);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            if (rafRef.current != null)
                window.cancelAnimationFrame(rafRef.current);
        };
    }, [visible, step, updateRect]);
    const startTour = useCallback((nextSteps) => {
        if (!nextSteps.length)
            return;
        setSteps(nextSteps);
        setCurrentStep(0);
        setVisible(true);
    }, []);
    const endTour = useCallback(() => {
        setVisible(false);
        setSteps([]);
        setCurrentStep(0);
        try {
            window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
        }
        catch {
            /* ignore */
        }
    }, []);
    const nextStep = useCallback(() => {
        setCurrentStep((i) => {
            if (i + 1 >= steps.length) {
                // End en el siguiente tick para no colisionar con setState
                setTimeout(() => endTour(), 0);
                return i;
            }
            return i + 1;
        });
    }, [steps.length, endTour]);
    // ESC para salir
    useEffect(() => {
        if (!visible)
            return;
        const onKey = (e) => {
            if (e.key === 'Escape')
                endTour();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [visible, endTour]);
    const value = useMemo(() => ({ visible, currentStep, steps, startTour, nextStep, endTour }), [visible, currentStep, steps, startTour, nextStep, endTour]);
    return (_jsxs(TourContext.Provider, { value: value, children: [children, visible && step && (_jsx("div", { className: "fixed inset-0 z-50 pointer-events-none", "aria-hidden": false, children: rect ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute bg-black/60 pointer-events-auto transition-all", style: { top: 0, left: 0, right: 0, height: Math.max(0, rect.top - 6) }, onClick: endTour }), _jsx("div", { className: "absolute bg-black/60 pointer-events-auto transition-all", style: {
                                top: rect.top + rect.height + 6,
                                left: 0,
                                right: 0,
                                bottom: 0,
                            }, onClick: endTour }), _jsx("div", { className: "absolute bg-black/60 pointer-events-auto transition-all", style: {
                                top: Math.max(0, rect.top - 6),
                                left: 0,
                                width: Math.max(0, rect.left - 6),
                                height: rect.height + 12,
                            }, onClick: endTour }), _jsx("div", { className: "absolute bg-black/60 pointer-events-auto transition-all", style: {
                                top: Math.max(0, rect.top - 6),
                                left: rect.left + rect.width + 6,
                                right: 0,
                                height: rect.height + 12,
                            }, onClick: endTour }), _jsx("div", { className: "absolute rounded-xl ring-4 ring-[hsl(var(--color-primary))] pointer-events-none transition-all", style: {
                                top: rect.top - 6,
                                left: rect.left - 6,
                                width: rect.width + 12,
                                height: rect.height + 12,
                            } }), _jsx(Tooltip, { rect: rect, step: step, index: currentStep, total: steps.length, onNext: nextStep, onSkip: endTour })] })) : (_jsx("div", { className: "absolute inset-0 bg-black/60 pointer-events-auto", onClick: endTour })) }))] }));
}
