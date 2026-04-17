import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@radikal/ui';
const ConfirmContext = createContext({
    confirm: () => Promise.resolve(false),
});
export function useConfirm() {
    return useContext(ConfirmContext).confirm;
}
export function ConfirmProvider({ children }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState({});
    const resolveRef = useRef(null);
    const confirm = useCallback((opts) => {
        setOptions(opts ?? {});
        setOpen(true);
        return new Promise((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);
    const handleConfirm = () => {
        setOpen(false);
        resolveRef.current?.(true);
    };
    const handleCancel = () => {
        setOpen(false);
        resolveRef.current?.(false);
    };
    return (_jsxs(ConfirmContext.Provider, { value: { confirm }, children: [children, _jsx(Dialog, { open: open, onOpenChange: (v) => !v && handleCancel(), children: _jsxs(DialogContent, { className: "sm:max-w-sm", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: options.title ?? '¿Estás seguro?' }) }), options.description && (_jsx("p", { className: "text-sm text-slate-600", children: options.description })), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "ghost", onClick: handleCancel, children: options.cancelLabel ?? 'Cancelar' }), _jsx(Button, { onClick: handleConfirm, className: options.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : '', children: options.confirmLabel ?? 'Confirmar' })] })] }) })] }));
}
