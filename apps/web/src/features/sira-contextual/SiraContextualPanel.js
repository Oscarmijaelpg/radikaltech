import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge, Button, Spinner } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { api } from '@/lib/api';
import { useProject } from '@/providers/ProjectProvider';
import { streamMessage } from '@/features/chat/api/chat';
import SiraAvatar from '@/media/sira_profile.webp';
import { useSiraContextual } from './SiraContextualProvider';
const KIND_LABEL = {
    news: 'Noticia',
    competitor: 'Competidor',
    content: 'Contenido',
    report: 'Reporte',
    free: 'Libre',
};
function detectReportIntent(text) {
    const t = text.toLowerCase();
    return t.includes('generar informe') || t.includes('crear reporte') || t.includes('generar reporte');
}
export function SiraContextualPanel() {
    const { open, collapsed, context, close, toggleCollapsed, setCollapsed } = useSiraContextual();
    const { activeProject } = useProject();
    const [chatId, setChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState(null);
    const bodyRef = useRef(null);
    const lastContextRef = useRef(null);
    // Reset chat when context changes (new target)
    useEffect(() => {
        if (!context)
            return;
        const key = JSON.stringify({ kind: context.kind, id: context.id, title: context.title });
        const prevKey = lastContextRef.current
            ? JSON.stringify({
                kind: lastContextRef.current.kind,
                id: lastContextRef.current.id,
                title: lastContextRef.current.title,
            })
            : null;
        if (key !== prevKey) {
            setChatId(null);
            setMessages([]);
            lastContextRef.current = context;
        }
    }, [context]);
    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [messages]);
    useEffect(() => {
        if (!toast)
            return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);
    const showReportButton = useMemo(() => {
        return messages.some((m) => m.role === 'assistant' && detectReportIntent(m.content));
    }, [messages]);
    if (!open || !context)
        return null;
    const title = context.title ?? 'Contextual';
    const send = async () => {
        const text = input.trim();
        if (!text || sending)
            return;
        setSending(true);
        setInput('');
        const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text };
        const assistantId = `a-${Date.now()}`;
        const assistantMsg = { id: assistantId, role: 'assistant', content: '', streaming: true };
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        try {
            let activeChatId = chatId;
            let firstTurn = false;
            if (!activeChatId) {
                firstTurn = true;
                const created = await api.post('/chats', {
                    agent_id: 'sira',
                    project_id: activeProject?.id ?? undefined,
                    title: `Sira — ${title}`,
                });
                activeChatId = created.data.id;
                setChatId(activeChatId);
            }
            const prefix = firstTurn
                ? `Contexto: ${JSON.stringify(context)}. El usuario te pregunta sobre esto.\n\n`
                : '';
            const payload = `${prefix}${text}`;
            await streamMessage(activeChatId, payload, {
                onToken: (chunk) => {
                    setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
                },
                onDone: () => {
                    setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)));
                },
                onError: (msg) => {
                    setMessages((prev) => prev.map((m) => m.id === assistantId
                        ? { ...m, content: m.content || `Error: ${msg}`, streaming: false }
                        : m));
                },
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Error';
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${msg}`, streaming: false } : m));
        }
        finally {
            setSending(false);
        }
    };
    const triggerReport = () => {
        void context;
        void chatId;
        setToast('Generación de reporte solicitada (próximamente)');
    };
    // Collapsed pill
    if (collapsed) {
        return (_jsxs("button", { type: "button", onClick: () => setCollapsed(false), className: "fixed bottom-4 right-4 z-[80] flex items-center gap-2 rounded-full bg-white shadow-2xl border border-slate-200 pl-1 pr-4 py-1 hover:shadow-xl transition-shadow", "aria-label": "Abrir Sira contextual", children: [_jsxs("span", { className: "relative", children: [_jsx("img", { src: SiraAvatar, alt: "Sira", className: "w-9 h-9 rounded-full object-cover border-2 border-cyan-400" }), _jsx("span", { className: "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" })] }), _jsx("span", { className: "text-sm font-semibold text-slate-800", children: "Sira est\u00E1 aqu\u00ED" })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: cn('fixed z-[80] bg-white shadow-2xl border border-slate-200', 'inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[400px] md:h-[600px]', 'md:rounded-3xl flex flex-col overflow-hidden'), role: "dialog", "aria-label": "Sira contextual", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50", children: [_jsx("img", { src: SiraAvatar, alt: "Sira", className: "w-10 h-10 rounded-full object-cover border-2 border-cyan-400" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-display font-black text-slate-900", children: "Sira" }), _jsx("p", { className: "text-[11px] text-slate-500 truncate", children: "Analista de mercado" })] }), _jsx("button", { type: "button", onClick: toggleCollapsed, className: "w-8 h-8 rounded-lg hover:bg-white/70 grid place-items-center text-slate-600", "aria-label": "Minimizar", children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: "remove" }) }), _jsx("button", { type: "button", onClick: close, className: "w-8 h-8 rounded-lg hover:bg-white/70 grid place-items-center text-slate-600", "aria-label": "Cerrar", children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: "close" }) })] }), _jsxs("div", { className: "px-4 py-2 border-b border-slate-100 flex items-center gap-2 bg-white", children: [_jsx(Badge, { className: "bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] uppercase", children: KIND_LABEL[context.kind] }), _jsxs("p", { className: "text-xs text-slate-600 truncate", children: ["Sobre: ", _jsx("span", { className: "font-semibold text-slate-800", children: title })] })] }), _jsxs("div", { ref: bodyRef, className: "flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50", children: [messages.length === 0 && (_jsx("div", { className: "text-center py-8 px-3", children: _jsxs("p", { className: "text-sm text-slate-500", children: ["Hola, soy Sira. Preg\u00FAntame lo que necesites sobre", ' ', _jsx("span", { className: "font-semibold text-slate-700", children: title }), "."] }) })), messages.map((m) => (_jsx("div", { className: cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start'), children: _jsx("div", { className: cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm', m.role === 'user'
                                        ? 'bg-[hsl(var(--color-primary))] text-white rounded-br-md'
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'), children: m.role === 'user' ? (_jsx("p", { className: "whitespace-pre-wrap break-words", children: m.content })) : (_jsxs("div", { className: "prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5", children: [_jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: m.content || ' ' }), m.streaming && (_jsxs("span", { className: "inline-flex items-center gap-2 text-slate-400 text-xs mt-1", children: [_jsx(Spinner, { size: "sm" }), " Escribiendo\u2026"] }))] })) }) }, m.id))), showReportButton && (_jsx("div", { className: "pt-2", children: _jsxs(Button, { onClick: triggerReport, className: "w-full", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "description" }), "Generar reporte"] }) }))] }), _jsxs("div", { className: "border-t border-slate-200 p-3 bg-white", children: [_jsxs("div", { className: "flex items-end gap-2", children: [_jsx("textarea", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                void send();
                                            }
                                        }, rows: 1, placeholder: "Pregunta a Sira\u2026", disabled: sending, className: "flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent disabled:opacity-60 max-h-32" }), _jsx(Button, { type: "button", onClick: () => void send(), disabled: sending || !input.trim(), className: "h-10", "aria-label": "Enviar", children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "send" }) })] }), _jsx("p", { className: "text-center text-[10px] text-slate-400 mt-1.5", children: "Enter env\u00EDa \u00B7 Shift+Enter salto" })] })] }), toast && (_jsx("div", { className: "fixed bottom-24 right-4 z-[90] bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-2xl max-w-xs", children: toast }))] }));
}
