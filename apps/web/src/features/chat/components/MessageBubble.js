import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spinner, Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, Button, Label, Textarea, } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { useProject } from '@/providers/ProjectProvider';
import { useCreateMemory } from '@/features/memory/api/memory';
import { exportToPDF, exportToWord } from '@/shared/utils/exportUtils';
import { ToolResultCard } from './ToolResultCard';
export function MessageBubble({ role, content, agent, streaming, userInitials, messageId, chatId, tools, routerReason, routerAgentName, onOpenReport, }) {
    const isUser = role === 'user';
    const [menuOpen, setMenuOpen] = useState(false);
    const [saveOpen, setSaveOpen] = useState(false);
    const [category, setCategory] = useState('note');
    const [value, setValue] = useState(content);
    const [saved, setSaved] = useState(false);
    const { activeProject } = useProject();
    const createMemory = useCreateMemory();
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
        }
        catch { }
        setMenuOpen(false);
    };
    const handleExportPDF = async () => {
        setMenuOpen(false);
        // Create a temporary container with the message content for PDF export
        const tempId = `msg-pdf-${messageId ?? Date.now()}`;
        const container = document.createElement('div');
        container.id = tempId;
        container.style.cssText = 'position:fixed;top:0;left:0;width:190mm;z-index:-9999;background:#fff;font-family:Helvetica,Arial,sans-serif;padding:20mm;';
        container.innerHTML = `<div style="white-space:pre-wrap;font-size:14px;line-height:1.8;color:#1e293b;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
        document.body.appendChild(container);
        await exportToPDF(tempId, 'mensaje-radikal.pdf');
        if (document.body.contains(container))
            document.body.removeChild(container);
    };
    const handleExportWord = async () => {
        setMenuOpen(false);
        await exportToWord(content, 'Mensaje Radikal IA');
    };
    const openSave = () => {
        setValue(content);
        setCategory('note');
        setSaved(false);
        setSaveOpen(true);
        setMenuOpen(false);
    };
    const handleSave = async () => {
        if (!activeProject?.id)
            return;
        await createMemory.mutateAsync({
            project_id: activeProject.id,
            category,
            value,
            metadata: {
                source: 'chat',
                chat_id: chatId ?? null,
                message_id: messageId ?? null,
            },
        });
        setSaved(true);
        setTimeout(() => setSaveOpen(false), 600);
    };
    return (_jsxs("div", { className: cn('flex gap-3 w-full', isUser ? 'justify-end' : 'justify-start'), children: [!isUser && agent && (_jsx("div", { className: "w-7 h-7 sm:w-9 sm:h-9 rounded-xl overflow-hidden shrink-0 bg-slate-200", children: _jsx("img", { src: agent.image, alt: agent.name, className: "w-full h-full object-cover" }) })), _jsxs("div", { className: cn('relative group max-w-[90%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed shadow-sm overflow-hidden', isUser
                    ? 'bg-[hsl(var(--color-primary))] text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'), children: [isUser ? (_jsx("p", { className: "whitespace-pre-wrap break-words", children: content })) : (_jsxs("div", { className: cn('prose prose-sm max-w-none', 'prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2', 'prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl', 'prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none'), children: [(routerReason || routerAgentName) && (_jsxs("p", { className: "text-[11px] text-slate-500 mb-2 animate-[fadeIn_.4s_ease] not-prose", children: [_jsx("span", { className: "material-symbols-outlined text-[12px] align-middle mr-1", children: "alt_route" }), routerAgentName ? `${routerAgentName} elegido por el router` : 'Router', routerReason ? ` · ${routerReason}` : ''] })), tools && tools.length > 0 && (_jsx("div", { className: "flex flex-col gap-1 mb-2 not-prose", children: tools.map((t, i) => (_jsxs("span", { className: cn('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold border', t.status === 'started'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                        : t.status === 'done'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'), children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: t.status === 'started'
                                                ? 'terminal'
                                                : t.status === 'done'
                                                    ? 'check_circle'
                                                    : 'error' }), t.status === 'started'
                                            ? `Ejecutando: ${t.label}`
                                            : t.status === 'done'
                                                ? `✓ ${t.label}`
                                                : `✗ ${t.label}`] }, `${t.name}-${i}`))) })), tools && tools.some((t) => t.status === 'done' && t.data) && (_jsx("div", { className: "not-prose", children: tools.filter((t) => t.status === 'done' && t.data).map((t, i) => (_jsx(ToolResultCard, { tool: t, onOpenReport: onOpenReport }, `${t.name}-${i}`))) })), _jsx("div", { className: "break-words overflow-x-auto", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: content || ' ' }) }), streaming && (_jsxs("span", { className: "inline-flex items-center gap-2 text-slate-400 text-xs mt-2 not-prose", children: [_jsx(Spinner, { size: "sm" }), " Escribiendo\u2026"] }))] })), !isUser && !streaming && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => setMenuOpen((v) => !v), className: "absolute -top-2 -right-2 p-1.5 sm:p-1 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity", "aria-label": "Opciones", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "more_horiz" }) }), menuOpen && (_jsxs("div", { className: "absolute z-20 top-6 right-0 sm:right-0 left-auto bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-44 sm:w-48", children: [_jsxs("button", { type: "button", onClick: handleCopy, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "content_copy" }), "Copiar"] }), _jsxs("button", { type: "button", onClick: openSave, disabled: !activeProject, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 disabled:opacity-50", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "bookmark_add" }), "Guardar en memoria"] }), content.length > 300 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-px bg-slate-100" }), onOpenReport && (_jsxs("button", { type: "button", onClick: () => { onOpenReport(content); setMenuOpen(false); }, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px] text-[hsl(var(--color-primary))]", children: "article" }), "Ver como informe"] })), _jsxs("button", { type: "button", onClick: handleExportPDF, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px] text-rose-500", children: "picture_as_pdf" }), "Exportar PDF"] }), _jsxs("button", { type: "button", onClick: handleExportWord, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px] text-blue-500", children: "description" }), "Exportar Word"] })] }))] }))] }))] }), isUser && (_jsx("div", { className: "w-7 h-7 sm:w-9 sm:h-9 rounded-xl shrink-0 bg-slate-900 text-white grid place-items-center text-[10px] sm:text-xs font-bold", children: userInitials ?? 'TÚ' })), _jsx(Dialog, { open: saveOpen, onOpenChange: setSaveOpen, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Guardar en memoria" }) }), _jsxs("div", { className: "space-y-4 py-2", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "memory-category", children: "Categor\u00EDa" }), _jsxs("select", { id: "memory-category", value: category, onChange: (e) => setCategory(e.target.value), className: "w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm", children: [_jsx("option", { value: "note", children: "Nota" }), _jsx("option", { value: "brand_insight", children: "Insight de marca" }), _jsx("option", { value: "idea", children: "Idea" })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "memory-value", children: "Contenido" }), _jsx(Textarea, { id: "memory-value", value: value, onChange: (e) => setValue(e.target.value), rows: 6 })] }), saved && (_jsx("p", { className: "text-xs font-semibold text-emerald-600", children: "\u2713 Guardado en memoria" }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setSaveOpen(false), children: "Cancelar" }), _jsx(Button, { type: "button", onClick: handleSave, disabled: !value.trim() || !activeProject || createMemory.isPending, children: createMemory.isPending ? 'Guardando…' : 'Guardar' })] })] }) })] }));
}
