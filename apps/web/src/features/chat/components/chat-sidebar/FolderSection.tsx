import type { ReactNode } from 'react';
import { Icon } from '@radikal/ui';
import type { Chat, ChatFolder } from '../../api/chat';

interface Props {
  sectionKey: string;
  label: string;
  items: Chat[];
  color: string | null;
  folder: ChatFolder | null;
  isCollapsed: boolean;
  folderMenuOpen: boolean;
  onToggleCollapse: (key: string) => void;
  onToggleFolderMenu: (id: string) => void;
  onEditFolder: (folder: ChatFolder) => void;
  onDeleteFolder: (folder: ChatFolder) => Promise<void> | void;
  renderChat: (chat: Chat) => ReactNode;
}

export function FolderSection({
  sectionKey,
  label,
  items,
  color,
  folder,
  isCollapsed,
  folderMenuOpen,
  onToggleCollapse,
  onToggleFolderMenu,
  onEditFolder,
  onDeleteFolder,
  renderChat,
}: Props) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1 px-2 py-1 group/section">
        <button
          type="button"
          onClick={() => onToggleCollapse(sectionKey)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <Icon
            name={isCollapsed ? 'chevron_right' : 'expand_more'}
            className="text-[16px] text-slate-400"
          />
          {color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
          )}
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 truncate">
            {label}
          </span>
          <span className="text-[10px] font-bold text-slate-400">({items.length})</span>
        </button>
        {folder && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFolderMenu(folder.id);
              }}
              aria-label="Opciones de carpeta"
              className="p-1 rounded-md text-slate-400 hover:bg-slate-200 opacity-0 group-hover/section:opacity-100"
            >
              <Icon name="more_horiz" className="text-[14px]" />
            </button>
            {folderMenuOpen && (
              <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-36">
                <button
                  type="button"
                  onClick={() => onEditFolder(folder)}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <Icon name="edit" className="text-[16px]" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void onDeleteFolder(folder)}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Icon name="delete" className="text-[16px]" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {!isCollapsed &&
        (items.length === 0 ? (
          <p className="text-[11px] text-slate-300 px-3 py-1">Vacío</p>
        ) : (
          items.map(renderChat)
        ))}
    </div>
  );
}
