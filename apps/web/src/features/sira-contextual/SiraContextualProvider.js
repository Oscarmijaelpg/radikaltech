import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
const Ctx = createContext(null);
export function SiraContextualProvider({ children }) {
    const [open, setOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [context, setContext] = useState(null);
    const openWith = useCallback((ctx) => {
        setContext(ctx);
        setOpen(true);
        setCollapsed(false);
    }, []);
    const close = useCallback(() => {
        setOpen(false);
    }, []);
    const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);
    const value = useMemo(() => ({ open, collapsed, context, openWith, close, toggleCollapsed, setCollapsed }), [open, collapsed, context, openWith, close, toggleCollapsed]);
    return _jsx(Ctx.Provider, { value: value, children: children });
}
export function useSiraContextual() {
    const v = useContext(Ctx);
    if (!v)
        throw new Error('useSiraContextual must be used within SiraContextualProvider');
    return v;
}
