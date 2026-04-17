import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useRef, useState, } from 'react';
import { Toast, ToastClose, ToastDescription, ToastProvider as RadixToastProvider, ToastTitle, ToastViewport, } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
const ToastContext = createContext(null);
const VARIANT_ICON = {
    default: 'info',
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
};
const VARIANT_CLASSES = {
    default: 'bg-white border border-[hsl(var(--color-border))] text-slate-900',
    success: 'bg-emerald-500 text-white border-transparent',
    error: 'bg-red-500 text-white border-transparent',
    warning: 'bg-amber-500 text-white border-transparent',
};
const VARIANT_ICON_CLASSES = {
    default: 'text-slate-500',
    success: 'text-white',
    error: 'text-white',
    warning: 'text-white',
};
let idSeq = 0;
const nextId = () => `toast-${Date.now()}-${idSeq++}`;
export function ToastProvider({ children }) {
    const [items, setItems] = useState([]);
    const timers = useRef(new Map());
    const dismiss = useCallback((id) => {
        setItems((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
    }, []);
    const remove = useCallback((id) => {
        setItems((prev) => prev.filter((t) => t.id !== id));
    }, []);
    const toast = useCallback((opts) => {
        const id = nextId();
        const duration = opts.duration ?? 4000;
        setItems((prev) => [...prev, { ...opts, id, open: true }]);
        if (duration > 0) {
            const t = setTimeout(() => dismiss(id), duration);
            timers.current.set(id, t);
        }
        return id;
    }, [dismiss]);
    const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
    return (_jsx(ToastContext.Provider, { value: value, children: _jsxs(RadixToastProvider, { swipeDirection: "right", duration: Infinity, children: [children, items.map((t) => {
                    const variant = t.variant ?? 'default';
                    return (_jsxs(Toast, { open: t.open, onOpenChange: (open) => {
                            if (!open) {
                                dismiss(t.id);
                                // Defer unmount so exit animation can run
                                setTimeout(() => remove(t.id), 200);
                            }
                        }, className: cn('animate-in slide-in-from-top-2 fade-in', VARIANT_CLASSES[variant], t.onClick && 'cursor-pointer hover:brightness-110 transition-[filter]'), onClick: (e) => {
                            if (!t.onClick)
                                return;
                            const target = e.target;
                            // No disparar si se hizo click en el botón de cerrar
                            if (target.closest('[toast-close]') || target.closest('button'))
                                return;
                            t.onClick();
                            dismiss(t.id);
                            setTimeout(() => remove(t.id), 200);
                        }, children: [_jsxs("div", { className: "flex items-start gap-3 w-full", children: [_jsx("span", { className: cn('material-symbols-outlined text-[22px] shrink-0', VARIANT_ICON_CLASSES[variant]), "aria-hidden": true, children: VARIANT_ICON[variant] }), _jsxs("div", { className: "flex-1 min-w-0", children: [t.title && _jsx(ToastTitle, { children: t.title }), t.description && (_jsx(ToastDescription, { children: t.description })), t.onClick && (_jsx("p", { className: "mt-1 text-[11px] font-semibold opacity-90 underline underline-offset-2", children: "Toca para ver" }))] })] }), _jsx(ToastClose, { "aria-label": "Cerrar notificaci\u00F3n" })] }, t.id));
                }), _jsx(ToastViewport, { className: cn('fixed z-[100] flex max-h-screen w-full flex-col gap-2 p-4 outline-none', 
                    // Mobile: top center
                    'top-0 left-1/2 -translate-x-1/2 items-center', 
                    // Desktop: top right
                    'sm:left-auto sm:right-0 sm:translate-x-0 sm:top-0 sm:bottom-auto sm:max-w-[420px] sm:items-stretch') })] }) }));
}
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used inside <ToastProvider>');
    }
    return ctx;
}
