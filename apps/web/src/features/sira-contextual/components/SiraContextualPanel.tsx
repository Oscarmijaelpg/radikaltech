import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Badge,
  Button,
  Icon,
  Spinner,
} from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { api } from '@/lib/api';
import { useProject } from '@/providers/ProjectProvider';
import { streamMessage, type Chat } from '@/features/chat/api/chat';
import SiraAvatar from '@/media/sira_profile.webp';
import { useSiraContextual, type SiraContext } from '../SiraContextualProvider';

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const KIND_LABEL: Record<SiraContext['kind'], string> = {
  news: 'Noticia',
  competitor: 'Competidor',
  content: 'Contenido',
  report: 'Reporte',
  free: 'Libre',
};

function detectReportIntent(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('generar informe') || t.includes('crear reporte') || t.includes('generar reporte');
}

export function SiraContextualPanel() {
  const { open, collapsed, context, close, toggleCollapsed, setCollapsed } = useSiraContextual();
  const { activeProject } = useProject();

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const lastContextRef = useRef<SiraContext | null>(null);

  // Reset chat when context changes (new target)
  useEffect(() => {
    if (!context) return;
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
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showReportButton = useMemo(() => {
    return messages.some((m) => m.role === 'assistant' && detectReportIntent(m.content));
  }, [messages]);

  if (!open || !context) return null;

  const title = context.title ?? 'Contextual';

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    const userMsg: UIMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: UIMessage = { id: assistantId, role: 'assistant', content: '', streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      let activeChatId = chatId;
      let firstTurn = false;
      if (!activeChatId) {
        firstTurn = true;
        const created = await api.post<{ data: Chat }>('/chats', {
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
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
          );
        },
        onError: (msg) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || `Error: ${msg}`, streaming: false }
                : m,
            ),
          );
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `Error: ${msg}`, streaming: false } : m,
        ),
      );
    } finally {
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
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-[80] flex items-center gap-2 rounded-full bg-white shadow-2xl border border-slate-200 pl-1 pr-4 py-1 hover:shadow-xl transition-shadow"
        aria-label="Abrir Sira contextual"
      >
        <span className="relative">
          <img
            src={SiraAvatar}
            alt="Sira"
            className="w-9 h-9 rounded-full object-cover border-2 border-cyan-400"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
        </span>
        <span className="text-sm font-semibold text-slate-800">Sira está aquí</span>
      </button>
    );
  }

  return (
    <>
      <div
        className={cn(
          'fixed z-[80] bg-white shadow-2xl border border-slate-200',
          'inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[400px] md:h-[600px]',
          'md:rounded-3xl flex flex-col overflow-hidden',
        )}
        role="dialog"
        aria-label="Sira contextual"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50">
          <img src={SiraAvatar} alt="Sira" className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-black text-slate-900">Sira</p>
            <p className="text-[11px] text-slate-500 truncate">Analista de mercado</p>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-8 h-8 rounded-lg hover:bg-white/70 grid place-items-center text-slate-600"
            aria-label="Minimizar"
          >
            <Icon name="remove" className="text-[20px]" />
          </button>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-lg hover:bg-white/70 grid place-items-center text-slate-600"
            aria-label="Cerrar"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 bg-white">
          <Badge className="bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] uppercase">
            {KIND_LABEL[context.kind]}
          </Badge>
          <p className="text-xs text-slate-600 truncate">
            Sobre: <span className="font-semibold text-slate-800">{title}</span>
          </p>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="text-center py-8 px-3">
              <p className="text-sm text-slate-500">
                Hola, soy Sira. Pregúntame lo que necesites sobre{' '}
                <span className="font-semibold text-slate-700">{title}</span>.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm',
                  m.role === 'user'
                    ? 'bg-[hsl(var(--color-primary))] text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md',
                )}
              >
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || ' '}</ReactMarkdown>
                    {m.streaming && (
                      <span className="inline-flex items-center gap-2 text-slate-400 text-xs mt-1">
                        <Spinner size="sm" /> Escribiendo…
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {showReportButton && (
            <div className="pt-2">
              <Button onClick={triggerReport} className="w-full">
                <Icon name="description" className="text-[18px]" />
                Generar reporte
              </Button>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 p-3 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Pregunta a Sira…"
              disabled={sending}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent disabled:opacity-60 max-h-32"
            />
            <Button
              type="button"
              onClick={() => void send()}
              disabled={sending || !input.trim()}
              className="h-10"
              aria-label="Enviar"
            >
              <Icon name="send" className="text-[18px]" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-1.5">
            Enter envía · Shift+Enter salto
          </p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 right-4 z-[90] bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-2xl max-w-xs">
          {toast}
        </div>
      )}
    </>
  );
}
