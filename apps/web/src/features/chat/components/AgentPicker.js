import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Spinner } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { AGENTS } from '../agents';
const MAX_AGENTS = 3;
export function AgentPicker({ open, onOpenChange, onPick, loading }) {
    const [selected, setSelected] = useState([]);
    const toggle = (id) => {
        setSelected((prev) => {
            if (prev.includes(id))
                return prev.filter((x) => x !== id);
            if (prev.length >= MAX_AGENTS)
                return prev;
            return [...prev, id];
        });
    };
    const handleConfirm = () => {
        if (selected.length === 0)
            return;
        onPick(selected);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: (v) => {
            if (!v)
                setSelected([]);
            onOpenChange(v);
        }, children: _jsxs(DialogContent, { className: "sm:!max-w-3xl max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "text-base sm:text-lg", children: ["Elige 1 o hasta ", MAX_AGENTS, " agentes", _jsx("span", { className: "block sm:inline sm:ml-2 text-xs font-medium text-slate-500 mt-1 sm:mt-0", children: "(multi-agente permite que el router elija el mejor por mensaje)" })] }) }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 mt-2", children: AGENTS.map((a) => {
                        const isSelected = selected.includes(a.id);
                        const disabled = !isSelected && selected.length >= MAX_AGENTS;
                        return (_jsxs("button", { type: "button", disabled: loading || disabled, onClick: () => toggle(a.id), className: cn('flex flex-col items-center text-center rounded-2xl border transition-all hover:-translate-y-1 disabled:opacity-50 disabled:pointer-events-none relative group overflow-hidden', isSelected
                                ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.04)] shadow-lg ring-2 ring-[hsl(var(--color-primary)/0.4)]'
                                : 'border-slate-200 bg-white hover:shadow-lg hover:border-slate-300'), children: [isSelected && (_jsx("span", { className: "absolute top-2 right-2 w-6 h-6 rounded-full bg-[hsl(var(--color-primary))] text-white grid place-items-center z-10 shadow-md", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "check" }) })), _jsx("div", { className: cn('w-full aspect-square bg-gradient-to-br overflow-hidden transition-transform group-hover:scale-[1.03]', a.color), children: _jsx("img", { src: a.image, alt: a.name, className: "w-full h-full object-cover" }) }), _jsxs("div", { className: "p-3 sm:p-4 w-full", children: [_jsx("h3", { className: "font-display font-bold text-base sm:text-lg text-slate-900", children: a.name }), _jsx("p", { className: "text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1", children: a.role }), _jsx("p", { className: "text-[11px] text-slate-500 line-clamp-2 leading-snug", children: a.description })] })] }, a.id));
                    }) }), _jsxs(DialogFooter, { className: "flex-col sm:flex-row gap-2 sm:gap-0", children: [_jsx("p", { className: "text-xs text-slate-500 sm:mr-auto self-center", children: selected.length === 0
                                ? 'Selecciona al menos 1 agente'
                                : selected.length === 1
                                    ? 'Modo individual'
                                    : `Modo multi-agente (${selected.length})` }), _jsxs("div", { className: "flex gap-2 w-full sm:w-auto", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), disabled: loading, className: "flex-1 sm:flex-none", children: "Cancelar" }), _jsx(Button, { type: "button", onClick: handleConfirm, disabled: loading || selected.length === 0, className: "flex-1 sm:flex-none", children: loading ? _jsx(Spinner, { size: "sm" }) : 'Crear' })] })] })] }) }));
}
