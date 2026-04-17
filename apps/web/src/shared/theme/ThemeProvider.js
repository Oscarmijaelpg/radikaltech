import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
const STORAGE_KEY = 'radikal-theme';
const ThemeContext = createContext(undefined);
function readStored() {
    try {
        const v = window.localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark' || v === 'system')
            return v;
    }
    catch {
        /* ignore */
    }
    return 'system';
}
function applyTheme(resolved) {
    const root = document.documentElement;
    if (resolved === 'dark')
        root.classList.add('dark');
    else
        root.classList.remove('dark');
}
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => typeof window === 'undefined' ? 'system' : readStored());
    const [systemDark, setSystemDark] = useState(() => {
        if (typeof window === 'undefined')
            return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setSystemDark(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    const resolvedTheme = useMemo(() => {
        if (theme === 'system')
            return systemDark ? 'dark' : 'light';
        return theme;
    }, [theme, systemDark]);
    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);
    const setTheme = useCallback((t) => {
        setThemeState(t);
        try {
            window.localStorage.setItem(STORAGE_KEY, t);
        }
        catch {
            /* ignore */
        }
    }, []);
    const cycleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
            try {
                window.localStorage.setItem(STORAGE_KEY, next);
            }
            catch {
                /* ignore */
            }
            return next;
        });
    }, []);
    const value = useMemo(() => ({ theme, resolvedTheme, setTheme, cycleTheme }), [theme, resolvedTheme, setTheme, cycleTheme]);
    return _jsx(ThemeContext.Provider, { value: value, children: children });
}
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx)
        throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
export function ThemeToggle({ className }) {
    const { theme, cycleTheme } = useTheme();
    const icon = theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'brightness_auto';
    const label = theme === 'light' ? 'Tema claro' : theme === 'dark' ? 'Tema oscuro' : 'Tema sistema';
    return (_jsx("button", { type: "button", onClick: cycleTheme, "aria-label": `Cambiar tema (actual: ${label})`, title: label, className: className ??
            'w-10 h-10 grid place-items-center rounded-xl bg-white/80 dark:bg-slate-800/80 border border-[hsl(var(--color-border))] hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-colors', children: _jsx("span", { className: "material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-200", children: icon }) }));
}
