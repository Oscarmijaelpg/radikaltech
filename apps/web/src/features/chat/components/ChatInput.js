import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
export function ChatInput({ disabled, onSend, placeholder }) {
    const [value, setValue] = useState('');
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
    }, [value]);
    const submit = () => {
        const v = value.trim();
        if (!v || disabled)
            return;
        onSend(v);
        setValue('');
    };
    return (_jsxs("div", { className: "border-t border-slate-200 bg-white/80 backdrop-blur-xl p-2 sm:p-4", children: [_jsxs("div", { className: "max-w-3xl mx-auto flex items-end gap-2", children: [_jsx("textarea", { ref: ref, value: value, onChange: (e) => setValue(e.target.value), placeholder: placeholder ?? 'Escribe un mensaje...', rows: 1, onKeyDown: (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                submit();
                            }
                        }, disabled: disabled, className: cn('flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-3 text-sm', 'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.5)] focus:border-transparent', 'disabled:opacity-60'), style: { maxHeight: 240, minHeight: 44 } }), _jsxs(Button, { type: "button", disabled: disabled || !value.trim(), onClick: submit, className: "h-11 px-3 sm:px-4 shrink-0", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "send" }), _jsx("span", { className: "ml-1 hidden sm:inline", children: "Enviar" })] })] }), _jsx("p", { className: "text-center text-[11px] text-slate-400 mt-1.5 sm:mt-2 hidden sm:block", children: "Enter para enviar \u00B7 Shift + Enter para nueva l\u00EDnea" })] }));
}
