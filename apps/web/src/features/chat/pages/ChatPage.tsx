import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Icon,
  Spinner,
} from '@radikal/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
import { Breadcrumb } from '@/shared/ui/Breadcrumb';
import { AgentPicker } from '../components/AgentPicker';
import { ChatHeader } from '../components/ChatHeader';
import { ChatInput } from '../components/ChatInput';
import { ChatSidebar } from '../components/ChatSidebar';
import { MessageList } from '../components/MessageList';
import { ReportPanelDrawer } from '../components/ReportPanelDrawer';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { AGENTS, getAgent } from '../agents';
import { useChat, useChats, useCreateChat, useMessages, useRenameChat } from '../api/chat';
import { toLocal, useChatStream } from '../hooks/useChatStream';

export function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activeProject } = useProject();
  const { toast } = useToast();

  const [archivedMode, setArchivedMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState<string | 'auto'>('auto');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const chatsQ = useChats(activeProject?.id ?? null, archivedMode);
  const chatQ = useChat(chatId);
  const messagesQ = useMessages(chatId);

  const createChat = useCreateChat();
  const renameChat = useRenameChat();

  const { localMessages, setLocalMessages, sending, reportPanel, setReportPanel, send } =
    useChatStream({ chatId, targetAgentId });

  const agentIdsFromChat = useMemo<string[]>(() => {
    const ids = chatQ.data?.agentIds;
    if (ids && ids.length > 0) return ids;
    return chatQ.data?.agentId ? [chatQ.data.agentId] : [];
  }, [chatQ.data?.agentIds, chatQ.data?.agentId]);
  const isMultiAgent = agentIdsFromChat.length > 1;
  const chatAgents = useMemo(
    () =>
      agentIdsFromChat
        .map((id) => getAgent(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof getAgent>>[],
    [agentIdsFromChat],
  );
  const agent = useMemo(() => getAgent(chatQ.data?.agentId), [chatQ.data?.agentId]);

  useEffect(() => {
    setTargetAgentId('auto');
  }, [chatId]);

  const chatProjectId = chatQ.data?.projectId ?? null;

  // Sync server messages a local state salvo mientras se está streameando: el
  // local tiene tools/agentId que el server aún no ha commiteado.
  useEffect(() => {
    if (!messagesQ.data) return;
    if (sending) return;
    setLocalMessages((prev) => {
      const hasLocalOnly = prev.some((m) => m.id.startsWith('local-'));
      if (hasLocalOnly) return prev;
      return messagesQ.data.map(toLocal);
    });
  }, [messagesQ.data, chatId, sending, setLocalMessages]);

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

  // Auto-send desde location.state (quickStart).
  const location = useLocation();
  const autoMessageRef = useRef<string | null>(null);
  const autoMessage = (location.state as { autoMessage?: string } | null)?.autoMessage ?? null;
  useEffect(() => {
    if (autoMessage && !autoMessageRef.current) {
      autoMessageRef.current = autoMessage;
      window.history.replaceState({}, '');
    }
  }, [autoMessage]);

  useEffect(() => {
    if (chatId && autoMessageRef.current && !sending && messagesQ.data !== undefined) {
      const msg = autoMessageRef.current;
      autoMessageRef.current = null;
      void send(msg);
    }
  }, [chatId, messagesQ.data, sending, send]);

  // Bootstrap chat desde ?q= (dashboard).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && !chatId) {
      void handleQuickStart(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <WelcomeScreen
            disabled={createChat.isPending || !!pendingMessage}
            onStart={handleQuickStart}
            onOpenPicker={() => setPickerOpen(true)}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
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
                <Icon name="menu" className="text-[24px]" />
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
              <ChatHeader
                chatTitle={chatQ.data?.title}
                titleDraft={titleDraft}
                onStartEdit={() => setTitleDraft(chatQ.data?.title ?? '')}
                onChangeTitleDraft={setTitleDraft}
                onSaveTitle={handleSaveTitle}
                onCancelTitle={() => setTitleDraft(null)}
                agent={agent}
                isMultiAgent={isMultiAgent}
                chatAgents={chatAgents}
                chatProjectId={chatProjectId}
              />
            </FeatureHint>

            <MessageList
              ref={scrollRef}
              messages={localMessages}
              isLoading={messagesQ.isLoading}
              agent={agent}
              userInitials={userInitials}
              chatId={chatId}
              onOpenReport={(c) => setReportPanel({ content: c, thinking: false })}
              onQuickPrompt={send}
            />

            {isMultiAgent && (
              <div className="px-2 sm:px-4 pt-2 pb-1 max-w-3xl mx-auto w-full">
                <label className="text-[11px] font-semibold text-slate-500 flex flex-wrap items-center gap-2">
                  <Icon name="record_voice_over" className="text-[14px]" />
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
              onSend={send}
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
        <ReportPanelDrawer
          content={reportPanel.content}
          isThinking={reportPanel.thinking}
          onClose={() => setReportPanel(null)}
        />
      )}

      <AgentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePickAgent}
        loading={createChat.isPending}
      />
    </div>
  );
}
