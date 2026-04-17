import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Spinner } from '@radikal/ui';
export function LoadingMessages({ messages, intervalMs = 2200 }) {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (messages.length <= 1)
            return;
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % messages.length);
        }, intervalMs);
        return () => clearInterval(id);
    }, [messages.length, intervalMs]);
    return (_jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-[hsl(var(--color-border))] px-4 py-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300", children: [_jsx(Spinner, { size: "sm" }), _jsx("p", { className: "text-sm font-medium text-slate-700 animate-in fade-in duration-500", children: messages[index] }, index)] }));
}
export const SAVING_MESSAGES = [
    'Guardando tu información...',
    'Ankor está organizando los datos...',
    'Preparando tu espacio de trabajo...',
    'Casi listo...',
];
export const ANALYZING_MESSAGES = [
    'Mapeando tu sitio con IA...',
    'Sira está leyendo tu contenido...',
    'Extrayendo propuesta de valor...',
    'Detectando audiencia objetivo...',
    'Esto puede tardar unos segundos...',
];
