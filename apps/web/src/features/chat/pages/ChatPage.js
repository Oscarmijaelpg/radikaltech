import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from '@radikal/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { cn } from '@/shared/utils/cn';
import { useToast } from '@/shared/ui/Toaster';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
import { Breadcrumb } from '@/shared/ui/Breadcrumb';
import { AgentPicker } from '../components/AgentPicker';
import { ChatInput } from '../components/ChatInput';
import { ChatSidebar } from '../components/ChatSidebar';
import { MessageBubble } from '../components/MessageBubble';
import { QuickPrompts } from '../components/QuickPrompts';
import { ReportPanel } from '../components/ReportPanel';
import { AGENTS, getAgent } from '../agents';
import { useChat, useChats, useCreateChat, useMessages, useRenameChat, streamMessage, } from '../api/chat';
function toLocal(m) {
    const meta = (m.metadata ?? {});
    return {
        id: m.id,
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
        agentId: meta?.agent_id ?? null,
        routerReason: meta?.router?.reason ?? null,
    };
}
export function ChatPage() {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const { activeProject } = useProject();
    const qc = useQueryClient();
    const [archivedMode, setArchivedMode] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [localMessages, setLocalMessages] = useState([]);
    const [titleDraft, setTitleDraft] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [reportPanel, setReportPanel] = useState(null);
    const reportStreamRef = useRef(false); // tracks if current stream is generating a report
    const scrollRef = useRef(null);
    const chatsQ = useChats(activeProject?.id ?? null, archivedMode);
    const chatQ = useChat(chatId);
    const messagesQ = useMessages(chatId);
    const { toast } = useToast();
    const createChat = useCreateChat();
    const renameChat = useRenameChat();
    const agentIdsFromChat = useMemo(() => {
        const ids = chatQ.data?.agentIds;
        if (ids && ids.length > 0)
            return ids;
        return chatQ.data?.agentId ? [chatQ.data.agentId] : [];
    }, [chatQ.data?.agentIds, chatQ.data?.agentId]);
    const isMultiAgent = agentIdsFromChat.length > 1;
    const chatAgents = useMemo(() => agentIdsFromChat.map((id) => getAgent(id)).filter(Boolean), [agentIdsFromChat]);
    const agent = useMemo(() => getAgent(chatQ.data?.agentId), [chatQ.data?.agentId]);
    const [targetAgentId, setTargetAgentId] = useState('auto');
    useEffect(() => {
        setTargetAgentId('auto');
    }, [chatId]);
    const chatProjectId = chatQ.data?.projectId ?? null;
    const { url: projectLogo, brightness: projectLogoBrightness } = useProjectLogoWithBrightness(chatProjectId && activeProject && chatProjectId === activeProject.id ? chatProjectId : null);
    // Sync server messages to local state when chat changes or refetches.
    // Skip sync if we're currently streaming (local state is richer than server).
    useEffect(() => {
        if (!messagesQ.data)
            return;
        if (sending)
            return; // don't overwrite while streaming
        setLocalMessages((prev) => {
            // If there are local-only messages (streaming ones with tools, etc.), keep them
            const hasLocalOnly = prev.some((m) => m.id.startsWith('local-'));
            if (hasLocalOnly)
                return prev;
            return messagesQ.data.map(toLocal);
        });
    }, [messagesQ.data, chatId, sending]);
    // Auto scroll
    useEffect(() => {
        const el = scrollRef.current;
        if (el)
            el.scrollTop = el.scrollHeight;
    }, [localMessages]);
    const userInitials = useMemo(() => {
        const name = profile?.full_name ?? profile?.email ?? '?';
        return name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }, [profile]);
    const handlePickAgent = async (agentIds) => {
        const chat = await createChat.mutateAsync({
            agent_ids: agentIds,
            project_id: activeProject?.id ?? null,
        });
        setPickerOpen(false);
        navigate(`/chat/${chat.id}`);
    };
    const [pendingMessage, setPendingMessage] = useState(null);
    const allAgentIds = AGENTS.map((a) => a.id);
    const handleQuickStart = async (message) => {
        setPendingMessage(message);
        try {
            const chat = await createChat.mutateAsync({
                agent_ids: allAgentIds,
                project_id: activeProject?.id ?? null,
                title: message.slice(0, 60),
            });
            navigate(`/chat/${chat.id}`, { state: { autoMessage: message } });
        }
        catch {
            setPendingMessage(null);
            toast({ title: 'No se pudo crear la conversación', variant: 'error' });
        }
    };
    // Auto-send message from quick start (uses React Router location.state which is reactive)
    const location = useLocation();
    const autoMessageRef = useRef(null);
    const autoMessage = location.state?.autoMessage ?? null;
    useEffect(() => {
        if (autoMessage && !autoMessageRef.current) {
            autoMessageRef.current = autoMessage;
            // Clear the state so it doesn't re-trigger on re-renders
            window.history.replaceState({}, '');
        }
    }, [autoMessage]);
    useEffect(() => {
        if (chatId && autoMessageRef.current && !sending && messagesQ.data !== undefined) {
            const msg = autoMessageRef.current;
            autoMessageRef.current = null;
            void handleSend(msg);
        }
    }, [chatId, messagesQ.data, sending]);
    // Handle ?q= param from dashboard
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q && !chatId) {
            void handleQuickStart(q);
        }
    }, []);
    const handleSend = async (text) => {
        if (!chatId)
            return;
        const userMsg = {
            id: `local-u-${Date.now()}`,
            role: 'user',
            content: text,
        };
        const assistantId = `local-a-${Date.now()}`;
        const assistantMsg = {
            id: assistantId,
            role: 'assistant',
            content: '',
            streaming: true,
        };
        setLocalMessages((prev) => [...prev, userMsg, assistantMsg]);
        setSending(true);
        reportStreamRef.current = false;
        await streamMessage(chatId, text, {
            targetAgentId: targetAgentId !== 'auto' ? targetAgentId : undefined,
            onAgentTurn: (ev) => {
                const found = AGENTS.find((a) => a.id === ev.agent_id);
                setLocalMessages((prev) => prev.map((m) => m.id === assistantId
                    ? {
                        ...m,
                        agentId: ev.agent_id,
                        routerReason: ev.router ? ev.reason : null,
                        routerAgentName: ev.router ? (found?.name ?? ev.agent_id) : null,
                    }
                    : m));
            },
            onToolCall: (ev) => {
                setLocalMessages((prev) => prev.map((m) => {
                    if (m.id !== assistantId)
                        return m;
                    const tools = [...(m.tools ?? [])];
                    tools.push({ name: ev.name, label: ev.label, status: 'started' });
                    return { ...m, tools };
                }));
                // Auto-open report panel when generate_report tool is called
                if (ev.name === 'generate_report') {
                    reportStreamRef.current = true;
                    setReportPanel({ content: '', thinking: true });
                }
            },
            onToolResult: (ev) => {
                setLocalMessages((prev) => prev.map((m) => {
                    if (m.id !== assistantId)
                        return m;
                    const tools = [...(m.tools ?? [])];
                    for (let i = tools.length - 1; i >= 0; i--) {
                        const t = tools[i];
                        if (t && t.name === ev.name && t.status === 'started') {
                            tools[i] = {
                                name: t.name,
                                label: t.label,
                                status: ev.status,
                                data: ev.data ?? null,
                                resultSummary: ev.result_summary,
                            };
                            break;
                        }
                    }
                    return { ...m, tools };
                }));
                // When report tool finishes, hidratar el panel con el markdown COMPLETO que
                // trae el tool_result (data.content). Esto garantiza que el panel tenga el
                // contenido aunque el LLM no lo re-imprima en el chat vía onToken.
                if (ev.name === 'generate_report') {
                    const toolContent = ev.data?.content ?? '';
                    setReportPanel((prev) => ({
                        content: toolContent || prev?.content || '',
                        thinking: false,
                    }));
                    reportStreamRef.current = false;
                }
            },
            onToken: (chunk) => {
                setLocalMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
                // Feed tokens to report panel in real-time
                if (reportStreamRef.current) {
                    setReportPanel((prev) => prev ? { ...prev, content: prev.content + chunk } : prev);
                }
            },
            onDone: () => {
                setLocalMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)));
                setSending(false);
                if (reportStreamRef.current) {
                    reportStreamRef.current = false;
                    setReportPanel((prev) => prev ? { ...prev, thinking: false } : prev);
                }
                qc.invalidateQueries({ queryKey: ['chats'] });
                qc.invalidateQueries({ queryKey: ['chat', chatId] });
                // Don't invalidate chat-messages immediately — local state already has the
                // streamed message. Re-fetching now would cause duplicates because the sync
                // effect replaces localMessages with server data that doesn't include local
                // enrichments (tools, agentId). Instead, refetch after a delay so the server
                // has committed the message and the next sync is clean.
                setTimeout(() => {
                    qc.invalidateQueries({ queryKey: ['chat-messages', chatId] });
                }, 2000);
            },
            onError: (msg) => {
                setLocalMessages((prev) => prev.map((m) => m.id === assistantId
                    ? { ...m, streaming: false, content: m.content || `⚠️ Error: ${msg}` }
                    : m));
                setSending(false);
                reportStreamRef.current = false;
            },
        });
    };
    const handleSaveTitle = async () => {
        if (!chatId || titleDraft === null)
            return;
        const trimmed = titleDraft.trim();
        if (!trimmed || trimmed === chatQ.data?.title) {
            setTitleDraft(null);
            return;
        }
        await renameChat.mutateAsync({ id: chatId, title: trimmed });
        setTitleDraft(null);
    };
    return (_jsxs("div", { className: "flex h-[100dvh] md:h-screen", children: [_jsx(ChatSidebar, { chats: chatsQ.data ?? [], loading: chatsQ.isLoading, activeId: chatId, archivedMode: archivedMode, onToggleArchivedMode: setArchivedMode, onSelect: (id) => navigate(`/chat/${id}`), onNew: () => setPickerOpen(true), mobileOpen: sidebarOpen, onMobileClose: () => setSidebarOpen(false) }), _jsx("section", { className: "flex-1 flex flex-col min-w-0 bg-gradient-to-br from-pink-50/30 via-white to-cyan-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950", children: !chatId ? (_jsxs("div", { className: "flex-1 overflow-y-auto", children: [_jsx("div", { className: "flex items-center px-4 pt-3 md:hidden", children: _jsx("button", { type: "button", onClick: () => setSidebarOpen(true), className: "p-2 rounded-lg text-slate-500 hover:bg-slate-100", "aria-label": "Abrir men\u00FA", children: _jsx("span", { className: "material-symbols-outlined text-[24px]", children: "menu" }) }) }), _jsxs("div", { className: "max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shadow-xl mb-4", children: _jsx("span", { className: "material-symbols-outlined text-[32px]", children: "forum" }) }), _jsx("h2", { className: "font-display font-black text-2xl md:text-3xl text-slate-900", children: "\u00BFEn qu\u00E9 te ayudamos?" }), _jsx("p", { className: "text-sm text-slate-500 mt-2 max-w-md mx-auto", children: "Escribe lo que necesitas o elige una opci\u00F3n r\u00E1pida." })] }), _jsx(QuickPrompts, { onSelect: handleQuickStart }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex-1 h-px bg-slate-200" }), _jsx("span", { className: "text-xs text-slate-400", children: "o escribe lo que quieras" }), _jsx("div", { className: "flex-1 h-px bg-slate-200" })] }), _jsx("div", { className: "relative", children: _jsx(ChatInput, { disabled: createChat.isPending || !!pendingMessage, onSend: handleQuickStart, placeholder: "Escribe tu pregunta y empezamos..." }) }), _jsxs("p", { className: "text-center text-xs text-slate-400", children: ["\u00BFQuieres elegir un agente espec\u00EDfico?", ' ', _jsx("button", { type: "button", onClick: () => setPickerOpen(true), className: "text-[hsl(var(--color-primary))] font-semibold hover:underline", children: "Crear conversaci\u00F3n manual" })] })] })] })) : chatQ.isLoading ? (_jsx("div", { className: "flex-1 grid place-items-center", children: _jsx(Spinner, {}) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "px-3 sm:px-6 pt-3 flex items-center justify-between gap-2 sm:gap-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl", children: [_jsx("button", { type: "button", onClick: () => setSidebarOpen(true), className: "p-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden shrink-0", "aria-label": "Abrir men\u00FA", children: _jsx("span", { className: "material-symbols-outlined text-[24px]", children: "menu" }) }), _jsx(Breadcrumb, { items: [
                                        { label: 'Chat', to: '/chat' },
                                        { label: chatQ.data?.title ?? 'Sin título' },
                                    ] }), _jsx(HelpButton, { title: "Chat con agentes", description: "Habla con Ankor, Sira, Nexo, Kronos o Indexa. Cada uno se especializa en algo distinto. Te responden en tiempo real.", tips: [
                                        'Si tu chat es multi-agente, el router elige automáticamente quién responde.',
                                        'Puedes renombrar el chat haciendo click en el título.',
                                        'La memoria activa inyecta contexto de tu marca y de chats anteriores.',
                                    ] })] }), _jsx(FeatureHint, { id: "chat-first-v1", title: "Habla en espa\u00F1ol, los agentes te entienden", description: "Escribe como hablar\u00EDas con un colega. Ankor, Sira o Kronos te responder\u00E1n con el contexto de tu marca.", children: _jsxs("header", { className: "border-b border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4", children: [_jsx("div", { className: "w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-slate-200 shrink-0", children: agent && (_jsx("img", { src: agent.image, alt: agent.name, className: "w-full h-full object-cover" })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [titleDraft !== null ? (_jsx("input", { autoFocus: true, value: titleDraft, onChange: (e) => setTitleDraft(e.target.value), onBlur: handleSaveTitle, onKeyDown: (e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSaveTitle();
                                                    }
                                                    if (e.key === 'Escape')
                                                        setTitleDraft(null);
                                                }, className: "w-full text-base font-bold bg-transparent border-b border-slate-300 focus:outline-none focus:border-[hsl(var(--color-primary))]" })) : (_jsx("button", { type: "button", onClick: () => setTitleDraft(chatQ.data?.title ?? ''), className: "text-left group", children: _jsxs("p", { className: "text-base font-bold text-slate-900 truncate flex items-center gap-2", children: [chatQ.data?.title ?? 'Sin título', _jsx("span", { className: "material-symbols-outlined text-[16px] text-slate-400 opacity-0 group-hover:opacity-100", children: "edit" })] }) })), _jsx("p", { className: "text-[10px] sm:text-[11px] text-slate-500 truncate", children: isMultiAgent
                                                    ? `Multi-agente: ${chatAgents.map((a) => a.name).join(' · ')}`
                                                    : agent
                                                        ? `${agent.name} · ${agent.role}`
                                                        : 'Agente desconocido' })] }), chatProjectId && (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("button", { type: "button", "aria-label": "Memoria activa", className: "hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition shrink-0", children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: "psychology" }), "Memoria activa"] }) }), _jsx(TooltipContent, { side: "bottom", className: "max-w-[240px] text-xs", children: "Este chat tiene contexto de tu marca, memorias del proyecto y res\u00FAmenes de chats anteriores." })] }) })), projectLogo && (_jsx("div", { className: "hidden sm:grid w-9 h-9 rounded-xl border border-slate-200 overflow-hidden place-items-center shrink-0", style: logoContainerStyle(projectLogoBrightness), children: _jsx("img", { src: projectLogo, alt: activeProject?.company_name ?? 'Proyecto', className: "w-full h-full object-contain p-0.5" }) }))] }) }), _jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6", children: _jsxs("div", { className: "max-w-3xl mx-auto flex flex-col gap-3 sm:gap-4", children: [localMessages.length === 0 && !messagesQ.isLoading && (_jsxs("div", { className: "py-6 space-y-4", children: [_jsxs("p", { className: "text-sm text-slate-400 text-center", children: ["Empieza a conversar con ", agent?.name ?? 'el agente', " o elige una opci\u00F3n r\u00E1pida:"] }), _jsx(QuickPrompts, { onSelect: handleSend, compact: true })] })), messagesQ.isLoading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Spinner, {}) })) : (localMessages.map((m) => {
                                        const msgAgent = m.agentId ? getAgent(m.agentId) : agent;
                                        return (_jsx(MessageBubble, { role: m.role, content: m.content, agent: msgAgent, streaming: m.streaming, userInitials: userInitials, messageId: m.id, chatId: chatId, tools: m.tools, routerReason: m.routerReason ?? null, routerAgentName: m.routerAgentName ?? null, onOpenReport: (c) => setReportPanel({ content: c, thinking: false }) }, m.id));
                                    }))] }) }), isMultiAgent && (_jsx("div", { className: "px-2 sm:px-4 pt-2 pb-1 max-w-3xl mx-auto w-full", children: _jsxs("label", { className: "text-[11px] font-semibold text-slate-500 flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: "record_voice_over" }), _jsx("span", { className: "hidden sm:inline", children: "Hablar con:" }), _jsxs("select", { value: targetAgentId, onChange: (e) => setTargetAgentId(e.target.value), className: "h-9 sm:h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium flex-1 min-w-0 max-w-xs", children: [_jsx("option", { value: "auto", children: "Auto (router)" }), chatAgents.map((a) => (_jsxs("option", { value: a.id, children: [a.name, " \u00B7 ", a.role] }, a.id)))] })] }) })), _jsx(ChatInput, { disabled: sending, onSend: handleSend, placeholder: isMultiAgent
                                ? targetAgentId === 'auto'
                                    ? 'Escribe un mensaje (el router elegirá agente)...'
                                    : `Escríbele a ${chatAgents.find((a) => a.id === targetAgentId)?.name ?? '...'}`
                                : agent
                                    ? `Escríbele a ${agent.name}...`
                                    : 'Escribe un mensaje...' })] })) }), reportPanel !== null && (_jsxs("div", { className: "fixed inset-0 z-50 flex md:relative md:inset-auto md:z-auto", children: [_jsx("div", { className: "absolute inset-0 bg-black/40 md:hidden", onClick: () => setReportPanel(null) }), _jsx("div", { className: "relative w-full md:w-[480px] lg:w-[560px] shrink-0 h-full", children: _jsx(ReportPanel, { content: reportPanel.content, isThinking: reportPanel.thinking, onClose: () => setReportPanel(null) }) })] })), _jsx(AgentPicker, { open: pickerOpen, onOpenChange: setPickerOpen, onPick: handlePickAgent, loading: createChat.isPending }), _jsx("span", { className: cn('hidden') })] }));
}
