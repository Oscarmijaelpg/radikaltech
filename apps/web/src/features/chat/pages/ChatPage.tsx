import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@radikal/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { cn } from '@/shared/utils/cn';
import { useToast } from '@/shared/ui/Toaster';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
import { Breadcrumb } from '@/shared/ui/Breadcrumb';
import { AgentPicker } from '../components/AgentPicker';
import { ChatInput } from '../components/ChatInput';
import { ChatSidebar } from '../components/ChatSidebar';
import { MessageBubble, type ToolChipState } from '../components/MessageBubble';
import { QuickPrompts } from '../components/QuickPrompts';
import { ReportPanel } from '../components/ReportPanel';
import { AGENTS, getAgent } from '../agents';
import {
  useChat,
  useChats,
  useCreateChat,
  useMessages,
  useRenameChat,
  streamMessage,
  type Message,
} from '../api/chat';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  agentId?: string | null;
  tools?: ToolChipState[];
  routerReason?: string | null;
  routerAgentName?: string | null;
}

function toLocal(m: Message): LocalMessage {
  const meta = (m.metadata ?? {}) as {
    agent_id?: string | null;
    router?: { reason?: string; router?: boolean } | null;
    tools?: Array<{ name: string; resultSummary: string }>;
  } | null;
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
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportPanel, setReportPanel] = useState<{ content: string; thinking: boolean } | null>(null);
  const reportStreamRef = useRef(false); // tracks if current stream is generating a report
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const chatsQ = useChats(activeProject?.id ?? null, archivedMode);
  const chatQ = useChat(chatId);
  const messagesQ = useMessages(chatId);

  const { toast } = useToast();
  const createChat = useCreateChat();
  const renameChat = useRenameChat();

  const agentIdsFromChat = useMemo<string[]>(() => {
    const ids = chatQ.data?.agentIds;
    if (ids && ids.length > 0) return ids;
    return chatQ.data?.agentId ? [chatQ.data.agentId] : [];
  }, [chatQ.data?.agentIds, chatQ.data?.agentId]);
  const isMultiAgent = agentIdsFromChat.length > 1;
  const chatAgents = useMemo(
    () => agentIdsFromChat.map((id) => getAgent(id)).filter(Boolean) as NonNullable<ReturnType<typeof getAgent>>[],
    [agentIdsFromChat],
  );
  const agent = useMemo(() => getAgent(chatQ.data?.agentId), [chatQ.data?.agentId]);
  const [targetAgentId, setTargetAgentId] = useState<string | 'auto'>('auto');
  useEffect(() => {
    setTargetAgentId('auto');
  }, [chatId]);
  const chatProjectId = chatQ.data?.projectId ?? null;
  const { url: projectLogo, brightness: projectLogoBrightness } = useProjectLogoWithBrightness(
    chatProjectId && activeProject && chatProjectId === activeProject.id ? chatProjectId : null,
  );

  // Sync server messages to local state when chat changes or refetches.
  // Skip sync if we're currently streaming (local state is richer than server).
  useEffect(() => {
    if (!messagesQ.data) return;
    if (sending) return; // don't overwrite while streaming
    setLocalMessages((prev) => {
      // If there are local-only messages (streaming ones with tools, etc.), keep them
      const hasLocalOnly = prev.some((m) => m.id.startsWith('local-'));
      if (hasLocalOnly) return prev;
      return messagesQ.data.map(toLocal);
    });
  }, [messagesQ.data, chatId, sending]);

  // Auto scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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

  const handlePickAgent = async (agentIds: string[]) => {
    const chat = await createChat.mutateAsync({
      agent_ids: agentIds,
      project_id: activeProject?.id ?? null,
    });
    setPickerOpen(false);
    navigate(`/chat/${chat.id}`);
  };

  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const allAgentIds = AGENTS.map((a) => a.id);

  const handleQuickStart = async (message: string) => {
    setPendingMessage(message);
    try {
      const chat = await createChat.mutateAsync({
        agent_ids: allAgentIds,
        project_id: activeProject?.id ?? null,
        title: message.slice(0, 60),
      });
      navigate(`/chat/${chat.id}`, { state: { autoMessage: message } });
    } catch {
      setPendingMessage(null);
      toast({ title: 'No se pudo crear la conversación', variant: 'error' });
    }
  };

  // Auto-send message from quick start (uses React Router location.state which is reactive)
  const location = useLocation();
  const autoMessageRef = useRef<string | null>(null);
  const autoMessage = (location.state as { autoMessage?: string } | null)?.autoMessage ?? null;
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

  const handleSend = async (text: string) => {
    if (!chatId) return;
    const userMsg: LocalMessage = {
      id: `local-u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const assistantId = `local-a-${Date.now()}`;
    const assistantMsg: LocalMessage = {
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
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  agentId: ev.agent_id,
                  routerReason: ev.router ? ev.reason : null,
                  routerAgentName: ev.router ? (found?.name ?? ev.agent_id) : null,
                }
              : m,
          ),
        );
      },
      onToolCall: (ev) => {
        setLocalMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const tools = [...(m.tools ?? [])];
            tools.push({ name: ev.name, label: ev.label, status: 'started' });
            return { ...m, tools };
          }),
        );
        // Auto-open report panel when generate_report tool is called
        if (ev.name === 'generate_report') {
          reportStreamRef.current = true;
          setReportPanel({ content: '', thinking: true });
        }
      },
      onToolResult: (ev) => {
        setLocalMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
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
          }),
        );
        // When report tool finishes, hidratar el panel con el markdown COMPLETO que
        // trae el tool_result (data.content). Esto garantiza que el panel tenga el
        // contenido aunque el LLM no lo re-imprima en el chat vía onToken.
        if (ev.name === 'generate_report') {
          const toolContent = (ev.data as { content?: string } | null)?.content ?? '';
          setReportPanel((prev) => ({
            content: toolContent || prev?.content || '',
            thinking: false,
          }));
          reportStreamRef.current = false;
        }
      },
      onToken: (chunk) => {
        setLocalMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
        // Feed tokens to report panel in real-time
        if (reportStreamRef.current) {
          setReportPanel((prev) => prev ? { ...prev, content: prev.content + chunk } : prev);
        }
      },
      onDone: () => {
        setLocalMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        );
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
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, streaming: false, content: m.content || `⚠️ Error: ${msg}` }
              : m,
          ),
        );
        setSending(false);
        reportStreamRef.current = false;
      },
    });
  };

  const handleSaveTitle = async () => {
    if (!chatId || titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === chatQ.data?.title) {
      setTitleDraft(null);
      return;
    }
    await renameChat.mutateAsync({ id: chatId, title: trimmed });
    setTitleDraft(null);
  };

  return (
    <div className="flex h-[100dvh] md:h-screen">
      <ChatSidebar
        chats={chatsQ.data ?? []}
        loading={chatsQ.isLoading}
        activeId={chatId}
        archivedMode={archivedMode}
        onToggleArchivedMode={setArchivedMode}
        onSelect={(id) => navigate(`/chat/${id}`)}
        onNew={() => setPickerOpen(true)}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <section className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-pink-50/30 via-white to-cyan-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {!chatId ? (
          <div className="flex-1 overflow-y-auto">
            {/* Mobile hamburger for welcome screen */}
            <div className="flex items-center px-4 pt-3 md:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Abrir menú"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>
            </div>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
              {/* Welcome */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shadow-xl mb-4">
                  <span className="material-symbols-outlined text-[32px]">forum</span>
                </div>
                <h2 className="font-display font-black text-2xl md:text-3xl text-slate-900">
                  ¿En qué te ayudamos?
                </h2>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                  Escribe lo que necesitas o elige una opción rápida.
                </p>
              </div>

              {/* Quick prompts */}
              <QuickPrompts onSelect={handleQuickStart} />

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">o escribe lo que quieras</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Input directo */}
              <div className="relative">
                <ChatInput
                  disabled={createChat.isPending || !!pendingMessage}
                  onSend={handleQuickStart}
                  placeholder="Escribe tu pregunta y empezamos..."
                />
              </div>

              {/* Link a agente específico */}
              <p className="text-center text-xs text-slate-400">
                ¿Quieres elegir un agente específico?{' '}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="text-[hsl(var(--color-primary))] font-semibold hover:underline"
                >
                  Crear conversación manual
                </button>
              </p>
            </div>
          </div>
        ) : chatQ.isLoading ? (
          <div className="flex-1 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="px-3 sm:px-6 pt-3 flex items-center justify-between gap-2 sm:gap-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden shrink-0"
                aria-label="Abrir menú"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>
              <Breadcrumb
                items={[
                  { label: 'Chat', to: '/chat' },
                  { label: chatQ.data?.title ?? 'Sin título' },
                ]}
              />
              <HelpButton
                title="Chat con agentes"
                description="Habla con Ankor, Sira, Nexo, Kronos o Indexa. Cada uno se especializa en algo distinto. Te responden en tiempo real."
                tips={[
                  'Si tu chat es multi-agente, el router elige automáticamente quién responde.',
                  'Puedes renombrar el chat haciendo click en el título.',
                  'La memoria activa inyecta contexto de tu marca y de chats anteriores.',
                ]}
              />
            </div>
            <FeatureHint
              id="chat-first-v1"
              title="Habla en español, los agentes te entienden"
              description="Escribe como hablarías con un colega. Ankor, Sira o Kronos te responderán con el contexto de tu marca."
            >
            <header className="border-b border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                {agent && (
                  <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {titleDraft !== null ? (
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveTitle();
                      }
                      if (e.key === 'Escape') setTitleDraft(null);
                    }}
                    className="w-full text-base font-bold bg-transparent border-b border-slate-300 focus:outline-none focus:border-[hsl(var(--color-primary))]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setTitleDraft(chatQ.data?.title ?? '')}
                    className="text-left group"
                  >
                    <p className="text-base font-bold text-slate-900 truncate flex items-center gap-2">
                      {chatQ.data?.title ?? 'Sin título'}
                      <span className="material-symbols-outlined text-[16px] text-slate-400 opacity-0 group-hover:opacity-100">
                        edit
                      </span>
                    </p>
                  </button>
                )}
                <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                  {isMultiAgent
                    ? `Multi-agente: ${chatAgents.map((a) => a.name).join(' · ')}`
                    : agent
                      ? `${agent.name} · ${agent.role}`
                      : 'Agente desconocido'}
                </p>
              </div>
              {chatProjectId && (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Memoria activa"
                        className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition shrink-0"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          psychology
                        </span>
                        Memoria activa
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                      Este chat tiene contexto de tu marca, memorias del proyecto y resúmenes
                      de chats anteriores.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {projectLogo && (
                <div
                  className="hidden sm:grid w-9 h-9 rounded-xl border border-slate-200 overflow-hidden place-items-center shrink-0"
                  style={logoContainerStyle(projectLogoBrightness)}
                >
                  <img
                    src={projectLogo}
                    alt={activeProject?.company_name ?? 'Proyecto'}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
              )}
            </header>
            </FeatureHint>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6">
              <div className="max-w-3xl mx-auto flex flex-col gap-3 sm:gap-4">
                {localMessages.length === 0 && !messagesQ.isLoading && (
                  <div className="py-6 space-y-4">
                    <p className="text-sm text-slate-400 text-center">
                      Empieza a conversar con {agent?.name ?? 'el agente'} o elige una opción rápida:
                    </p>
                    <QuickPrompts onSelect={handleSend} compact />
                  </div>
                )}
                {messagesQ.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  localMessages.map((m) => {
                    const msgAgent = m.agentId ? getAgent(m.agentId) : agent;
                    return (
                      <MessageBubble
                        key={m.id}
                        role={m.role}
                        content={m.content}
                        agent={msgAgent}
                        streaming={m.streaming}
                        userInitials={userInitials}
                        messageId={m.id}
                        chatId={chatId}
                        tools={m.tools}
                        routerReason={m.routerReason ?? null}
                        routerAgentName={m.routerAgentName ?? null}
                        onOpenReport={(c) => setReportPanel({ content: c, thinking: false })}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {isMultiAgent && (
              <div className="px-2 sm:px-4 pt-2 pb-1 max-w-3xl mx-auto w-full">
                <label className="text-[11px] font-semibold text-slate-500 flex flex-wrap items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">record_voice_over</span>
                  <span className="hidden sm:inline">Hablar con:</span>
                  <select
                    value={targetAgentId}
                    onChange={(e) => setTargetAgentId(e.target.value)}
                    className="h-9 sm:h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium flex-1 min-w-0 max-w-xs"
                  >
                    <option value="auto">Auto (router)</option>
                    {chatAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {a.role}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <ChatInput
              disabled={sending}
              onSend={handleSend}
              placeholder={
                isMultiAgent
                  ? targetAgentId === 'auto'
                    ? 'Escribe un mensaje (el router elegirá agente)...'
                    : `Escríbele a ${chatAgents.find((a) => a.id === targetAgentId)?.name ?? '...'}`
                  : agent
                    ? `Escríbele a ${agent.name}...`
                    : 'Escribe un mensaje...'
              }
            />
          </>
        )}
      </section>

      {reportPanel !== null && (
        <div className="fixed inset-0 z-50 flex md:relative md:inset-auto md:z-auto">
          <div
            className="absolute inset-0 bg-black/40 md:hidden"
            onClick={() => setReportPanel(null)}
          />
          <div className="relative w-full md:w-[480px] lg:w-[560px] shrink-0 h-full">
            <ReportPanel
              content={reportPanel.content}
              isThinking={reportPanel.thinking}
              onClose={() => setReportPanel(null)}
            />
          </div>
        </div>
      )}

      <AgentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickAgent}
        loading={createChat.isPending}
      />
      {/* cn is used indirectly in children; keep import warm */}
      <span className={cn('hidden')} />
    </div>
  );
}
