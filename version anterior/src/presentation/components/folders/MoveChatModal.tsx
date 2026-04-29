
import React from 'react';
import { Modal } from '../ui/Modal';
import { ProjectFolder, Chat } from '../../../core/domain/entities';
import { FOLDER_COLORS } from './FolderModal';

interface MoveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
  folders: ProjectFolder[];
  chat: Chat | null;
  isLoading?: boolean;
}

export const MoveChatModal: React.FC<MoveChatModalProps> = ({
  isOpen,
  onClose,
  onMove,
  folders,
  chat,
  isLoading,
}) => {
  if (!chat) return null;

  const colorConfig = (colorId: string) =>
    FOLDER_COLORS.find(c => c.id === colorId) || FOLDER_COLORS[6];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mover a carpeta" maxWidth="sm">
      <div className="space-y-2">
        <p className="text-sm text-slate-500 mb-4">
          Selecciona una carpeta para <span className="font-semibold text-slate-700">"{chat.title}"</span>
        </p>

        {/* Sin carpeta */}
        <button
          onClick={() => onMove(null)}
          disabled={isLoading || !chat.folder_id}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
            !chat.folder_id
              ? 'border-slate-300 bg-slate-50 cursor-not-allowed opacity-60'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-slate-400 text-base">chat_bubble_outline</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700">Sin carpeta</p>
            <p className="text-xs text-slate-400">Chats recientes</p>
          </div>
          {!chat.folder_id && (
            <span className="material-symbols-outlined text-slate-400 text-sm">check</span>
          )}
        </button>

        {folders.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-4">No tienes carpetas creadas aún</p>
        )}

        {folders.map(folder => {
          const color = colorConfig(folder.color);
          const isCurrentFolder = chat.folder_id === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => onMove(folder.id)}
              disabled={isLoading || isCurrentFolder}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                isCurrentFolder
                  ? 'border-slate-300 bg-slate-50 cursor-not-allowed opacity-60'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color.bg}`}>
                <span className="material-symbols-outlined text-white text-base">{folder.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{folder.name}</p>
                {folder.description && (
                  <p className="text-xs text-slate-400 truncate">{folder.description}</p>
                )}
              </div>
              {isCurrentFolder && (
                <span className="material-symbols-outlined text-slate-400 text-sm">check</span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
