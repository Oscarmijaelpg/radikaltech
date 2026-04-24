import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Icon } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { getAgent } from '../../agents';
import type { Chat, ChatFolder } from '../../api/chat';
import { DEFAULT_FOLDER_COLOR } from './constants';

interface Props {
  chat: Chat;
  isActive: boolean;
  folders: ChatFolder[];
  menuOpen: boolean;
  moveMenuOpen: boolean;
  onSelect: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onToggleMoveMenu: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => Promise<void> | void;
  onMove: (id: string, folderId: string | null) => void;
}

export function ChatListItem({
  chat,
  isActive,
  folders,
  menuOpen,
  moveMenuOpen,
  onSelect,
  onToggleMenu,
  onToggleMoveMenu,
  onArchive,
  onDelete,
  onMove,
}: Props) {
  const agent = getAgent(chat.agentId);
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => onSelect(chat.id)}
        className={cn(
          'w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors mb-1',
          isActive ? 'bg-[hsl(var(--color-primary)/0.08)]' : 'hover:bg-slate-100',
        )}
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0">
          {agent && (
            <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {chat.title ?? 'Sin título'}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {agent?.name ?? 'Agente'} ·{' '}
            {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true, locale: es })}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMenu(chat.id);
        }}
        aria-label="Opciones de chat"
        className="absolute right-2 top-3 p-1 rounded-md text-slate-400 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Icon name="more_horiz" className="text-[16px]" />
      </button>
      {menuOpen && (
        <div className="absolute right-2 top-10 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-44">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMoveMenu(chat.id);
            }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Icon name="drive_file_move" className="text-[16px]" />
            Mover a...
          </button>
          <button
            type="button"
            onClick={() => onArchive(chat.id, !chat.isArchived)}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Icon name={chat.isArchived ? 'unarchive' : 'archive'} className="text-[16px]" />
            {chat.isArchived ? 'Desarchivar' : 'Archivar'}
          </button>
          <button
            type="button"
            onClick={() => void onDelete(chat.id)}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Icon name="delete" className="text-[16px]" />
            Eliminar
          </button>
        </div>
      )}
      {moveMenuOpen && (
        <div className="absolute right-2 top-10 z-30 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-48 max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => onMove(chat.id, null)}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Icon name="folder_off" className="text-[16px]" />
            Sin carpeta
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onMove(chat.id, f.id)}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: f.color ?? DEFAULT_FOLDER_COLOR }}
              />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
