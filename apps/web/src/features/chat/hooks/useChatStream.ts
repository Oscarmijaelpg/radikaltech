import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AGENTS } from '../agents';
import { streamMessage, type Message } from '../api/chat';
import type { ToolChipState } from '../components/MessageBubble';

const SERVER_COMMIT_DELAY_MS = 2000;

export interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  agentId?: string | null;
  tools?: ToolChipState[];
  routerReason?: string | null;
  routerAgentName?: string | null;
}

export interface ReportPanelState {
  content: string;
  thinking: boolean;
}

export function toLocal(m: Message): LocalMessage {
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

interface UseChatStreamOptions {
  chatId: string | undefined;
  targetAgentId: string | 'auto';
  onFirstMessageSent?: () => void;
}

export function useChatStream({ chatId, targetAgentId }: UseChatStreamOptions) {
  const qc = useQueryClient();
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [reportPanel, setReportPanel] = useState<ReportPanelState | null>(null);
  const reportStreamRef = useRef(false);

  const send = async (text: string) => {
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
        // Hidratar el panel con el markdown completo del tool_result (onToken puede
        // no re-imprimir el contenido).
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
        if (reportStreamRef.current) {
          setReportPanel((prev) => (prev ? { ...prev, content: prev.content + chunk } : prev));
        }
      },
      onDone: () => {
        setLocalMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        );
        setSending(false);
        if (reportStreamRef.current) {
          reportStreamRef.current = false;
          setReportPanel((prev) => (prev ? { ...prev, thinking: false } : prev));
        }
        qc.invalidateQueries({ queryKey: ['chats'] });
        qc.invalidateQueries({ queryKey: ['chat', chatId] });
        // Refetch diferido: evita que local state se sobreescriba mientras aún tiene
        // enriquecimientos (tools, agentId) que el server no retorna al instante.
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ['chat-messages', chatId] });
        }, SERVER_COMMIT_DELAY_MS);
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

  return {
    localMessages,
    setLocalMessages,
    sending,
    reportPanel,
    setReportPanel,
    send,
  };
}
