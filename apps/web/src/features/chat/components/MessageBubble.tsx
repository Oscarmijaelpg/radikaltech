import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SAVE_SUCCESS_DISMISS_MS = 600;

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Label,
  Spinner,
  Textarea,
} from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { useProject } from '@/providers/ProjectProvider';
import { useCreateMemory } from '@/features/memory/api/memory';
import { exportToPDF, exportToWord } from '@/shared/utils/exportUtils';
import type { AgentMeta } from '../agents';
import { ToolResultCard } from './ToolResultCard';

export interface ToolChipState {
  name: string;
  label: string;
  status: 'started' | 'done' | 'error';
  data?: Record<string, unknown> | null;
  resultSummary?: string;
}

interface Props {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: AgentMeta;
  streaming?: boolean;
  userInitials?: string;
  messageId?: string;
  chatId?: string;
  tools?: ToolChipState[];
  routerReason?: string | null;
  routerAgentName?: string | null;
  onOpenReport?: (content: string) => void;
}

type MemoryCategory = 'note' | 'brand_insight' | 'idea';

export function MessageBubble({
  role,
  content,
  agent,
  streaming,
  userInitials,
  messageId,
  chatId,
  tools,
  routerReason,
  routerAgentName,
  onOpenReport,
}: Props) {
  const isUser = role === 'user';
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [category, setCategory] = useState<MemoryCategory>('note');
  const [value, setValue] = useState(content);
  const [saved, setSaved] = useState(false);

  const { activeProject } = useProject();
  const createMemory = useCreateMemory();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {}
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
    if (document.body.contains(container)) document.body.removeChild(container);
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
    if (!activeProject?.id) return;
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
    setTimeout(() => setSaveOpen(false), SAVE_SUCCESS_DISMISS_MS);
  };

  return (
    <div className={cn('flex gap-3 w-full', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && agent && (
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl overflow-hidden shrink-0 bg-slate-200">
          <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div
        className={cn(
          'relative group max-w-[90%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed shadow-sm overflow-hidden',
          isUser
            ? 'bg-[hsl(var(--color-primary))] text-white rounded-br-md'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div
            className={cn(
              'prose prose-sm max-w-none',
              'prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2',
              'prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl',
              'prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none',
            )}
          >
            {(routerReason || routerAgentName) && (
              <p className="text-[11px] text-slate-500 mb-2 animate-[fadeIn_.4s_ease] not-prose">
                <Icon name="alt_route" className="text-[12px] align-middle mr-1" />
                {routerAgentName ? `${routerAgentName} elegido por el router` : 'Router'}
                {routerReason ? ` · ${routerReason}` : ''}
              </p>
            )}
            {tools && tools.length > 0 && (
              <div className="flex flex-col gap-1 mb-2 not-prose">
                {tools.map((t, i) => (
                  <span
                    key={`${t.name}-${i}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold border',
                      t.status === 'started'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        : t.status === 'done'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200',
                    )}
                  >
                    <Icon name={t.status === 'started'
                        ? 'terminal'
                        : t.status === 'done'
                          ? 'check_circle'
                          : 'error'} className="text-[14px]" />
                    {t.status === 'started'
                      ? `Ejecutando: ${t.label}`
                      : t.status === 'done'
                        ? `✓ ${t.label}`
                        : `✗ ${t.label}`}
                  </span>
                ))}
              </div>
            )}
            {tools && tools.some((t) => t.status === 'done' && t.data) && (
              <div className="not-prose">
                {tools.filter((t) => t.status === 'done' && t.data).map((t, i) => (
                  <ToolResultCard
                    key={`${t.name}-${i}`}
                    tool={t}
                    onOpenReport={onOpenReport}
                  />
                ))}
              </div>
            )}
            <div className="break-words overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ' '}</ReactMarkdown>
            </div>
            {streaming && (
              <span className="inline-flex items-center gap-2 text-slate-400 text-xs mt-2 not-prose">
                <Spinner size="sm" /> Escribiendo…
              </span>
            )}
          </div>
        )}

        {!isUser && !streaming && (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="absolute -top-2 -right-2 p-1.5 sm:p-1 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Opciones"
            >
              <Icon name="more_horiz" className="text-[16px]" />
            </button>
            {menuOpen && (
              <div className="absolute z-20 top-6 right-0 sm:right-0 left-auto bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-44 sm:w-48">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <Icon name="content_copy" className="text-[16px]" />
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={openSave}
                  disabled={!activeProject}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 disabled:opacity-50"
                >
                  <Icon name="bookmark_add" className="text-[16px]" />
                  Guardar en memoria
                </button>
                {content.length > 300 && (
                  <>
                    <div className="h-px bg-slate-100" />
                    {onOpenReport && (
                      <button
                        type="button"
                        onClick={() => { onOpenReport(content); setMenuOpen(false); }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <Icon name="article" className="text-[16px] text-[hsl(var(--color-primary))]" />
                        Ver como informe
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <Icon name="picture_as_pdf" className="text-[16px] text-rose-500" />
                      Exportar PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleExportWord}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <Icon name="description" className="text-[16px] text-blue-500" />
                      Exportar Word
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl shrink-0 bg-slate-900 text-white grid place-items-center text-[10px] sm:text-xs font-bold">
          {userInitials ?? 'TÚ'}
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar en memoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="memory-category">Categoría</Label>
              <select
                id="memory-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MemoryCategory)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
              >
                <option value="note">Nota</option>
                <option value="brand_insight">Insight de marca</option>
                <option value="idea">Idea</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memory-value">Contenido</Label>
              <Textarea
                id="memory-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={6}
              />
            </div>
            {saved && (
              <p className="text-xs font-semibold text-emerald-600">✓ Guardado en memoria</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!value.trim() || !activeProject || createMemory.isPending}
            >
              {createMemory.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
