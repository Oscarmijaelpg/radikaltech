import {
  Icon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@radikal/ui';
import { logoContainerStyle, useProjectLogoWithBrightness } from '@/shared/hooks/useProjectLogo';
import { useProject } from '@/providers/ProjectProvider';
import type { AgentMeta } from '../agents';

interface Props {
  chatTitle: string | null | undefined;
  titleDraft: string | null;
  onStartEdit: () => void;
  onChangeTitleDraft: (v: string) => void;
  onSaveTitle: () => void;
  onCancelTitle: () => void;
  agent: AgentMeta | undefined;
  isMultiAgent: boolean;
  chatAgents: AgentMeta[];
  chatProjectId: string | null;
}

export function ChatHeader({
  chatTitle,
  titleDraft,
  onStartEdit,
  onChangeTitleDraft,
  onSaveTitle,
  onCancelTitle,
  agent,
  isMultiAgent,
  chatAgents,
  chatProjectId,
}: Props) {
  const { activeProject } = useProject();
  const { url: projectLogo, brightness: projectLogoBrightness } = useProjectLogoWithBrightness(
    chatProjectId && activeProject && chatProjectId === activeProject.id ? chatProjectId : null,
  );

  return (
    <header className="border-b border-slate-200 bg-white/70 backdrop-blur-xl px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-slate-200 shrink-0">
        {agent && <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        {titleDraft !== null ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => onChangeTitleDraft(e.target.value)}
            onBlur={onSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSaveTitle();
              }
              if (e.key === 'Escape') onCancelTitle();
            }}
            className="w-full text-base font-bold bg-transparent border-b border-slate-300 focus:outline-none focus:border-[hsl(var(--color-primary))]"
          />
        ) : (
          <button type="button" onClick={onStartEdit} className="text-left group">
            <p className="text-base font-bold text-slate-900 truncate flex items-center gap-2">
              {chatTitle ?? 'Sin título'}
              <Icon name="edit" className="text-[16px] text-slate-400 opacity-0 group-hover:opacity-100" />
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
                <Icon name="psychology" className="text-[14px]" />
                Memoria activa
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-xs">
              Este chat tiene contexto de tu marca, memorias del proyecto y resúmenes de chats
              anteriores.
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
  );
}
