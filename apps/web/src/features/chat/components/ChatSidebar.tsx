import { useMemo, useState } from 'react';
import { Button, Icon, Spinner } from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { cn } from '@/shared/utils/cn';
import { useProject } from '@/providers/ProjectProvider';
import type { Chat, ChatFolder } from '../api/chat';
import {
  useArchiveChat,
  useDeleteChat,
  useChatFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveChat,
} from '../api/chat';
import { ChatListItem } from './chat-sidebar/ChatListItem';
import { FolderDialog } from './chat-sidebar/FolderDialog';
import { FolderSection } from './chat-sidebar/FolderSection';
import { DEFAULT_FOLDER_COLOR } from './chat-sidebar/constants';

interface Props {
  chats: Chat[];
  loading: boolean;
  activeId?: string;
  archivedMode: boolean;
  onToggleArchivedMode: (v: boolean) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function ChatSidebar({
  chats,
  loading,
  activeId,
  archivedMode,
  onToggleArchivedMode,
  onSelect,
  onNew,
  mobileOpen,
  onMobileClose,
}: Props) {
  const confirmDialog = useConfirm();
  const { activeProject } = useProject();
  const foldersQ = useChatFolders(activeProject?.id ?? null);
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const moveChat = useMoveChat();
  const archive = useArchiveChat();
  const del = useDeleteChat();

  const [menuId, setMenuId] = useState<string | null>(null);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<ChatFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(DEFAULT_FOLDER_COLOR);

  const folders = foldersQ.data ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string | null, Chat[]>();
    map.set(null, []);
    for (const f of folders) map.set(f.id, []);
    for (const c of chats) {
      const key = c.folderId ?? null;
      if (!map.has(key)) map.set(null, map.get(null) ?? []);
      (map.get(key) ?? map.get(null))!.push(c);
    }
    return map;
  }, [chats, folders]);

  const openNewFolder = () => {
    setEditFolder(null);
    setFolderName('');
    setFolderColor(DEFAULT_FOLDER_COLOR);
    setNewFolderOpen(true);
  };

  const openEditFolder = (f: ChatFolder) => {
    setEditFolder(f);
    setFolderName(f.name);
    setFolderColor(f.color ?? DEFAULT_FOLDER_COLOR);
    setNewFolderOpen(true);
    setFolderMenuId(null);
  };

  const handleSaveFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    if (editFolder) {
      await updateFolder.mutateAsync({ id: editFolder.id, name, color: folderColor });
    } else {
      await createFolder.mutateAsync({
        project_id: activeProject?.id ?? null,
        name,
        color: folderColor,
      });
    }
    setNewFolderOpen(false);
  };

  const handleDeleteFolder = async (f: ChatFolder) => {
    const ok = await confirmDialog({
      title: `¿Eliminar la carpeta "${f.name}"? Los chats se moverán a "Sin carpeta".`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    await deleteFolder.mutateAsync(f.id);
    setFolderMenuId(null);
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectChat = (id: string) => {
    onSelect(id);
    onMobileClose?.();
  };

  const toggleChatMenu = (id: string) => {
    setMenuId(menuId === id ? null : id);
    setMoveMenuId(null);
  };

  const toggleMoveMenu = (id: string) => {
    setMoveMenuId(moveMenuId === id ? null : id);
  };

  const handleArchive = (id: string, archived: boolean) => {
    archive.mutate({ id, archived });
    setMenuId(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({
      title: '¿Eliminar esta conversación?',
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (ok) del.mutate(id);
    setMenuId(null);
  };

  const handleMove = (id: string, folderId: string | null) => {
    moveChat.mutate({ id, folder_id: folderId });
    setMoveMenuId(null);
    setMenuId(null);
  };

  const renderChat = (chat: Chat) => (
    <ChatListItem
      key={chat.id}
      chat={chat}
      isActive={chat.id === activeId}
      folders={folders}
      menuOpen={menuId === chat.id}
      moveMenuOpen={moveMenuId === chat.id}
      onSelect={handleSelectChat}
      onToggleMenu={toggleChatMenu}
      onToggleMoveMenu={toggleMoveMenu}
      onArchive={handleArchive}
      onDelete={handleDelete}
      onMove={handleMove}
    />
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-slate-200 bg-white/95 backdrop-blur-xl flex flex-col h-full transition-transform duration-300 ease-in-out',
          'md:static md:z-auto md:translate-x-0 md:w-64 lg:w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <Button
            onClick={() => {
              onNew();
              onMobileClose?.();
            }}
            className="flex-1 justify-center"
          >
            <Icon name="add" className="text-[18px]" />
            <span className="ml-1">Nueva conversación</span>
          </Button>
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 md:hidden"
            aria-label="Cerrar menú"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="px-3 pt-3 pb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleArchivedMode(false)}
            className={cn(
              'flex-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors',
              !archivedMode ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            Activas
          </button>
          <button
            type="button"
            onClick={() => onToggleArchivedMode(true)}
            className={cn(
              'flex-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors',
              archivedMode ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            Archivadas
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={openNewFolder}
            className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <Icon name="create_new_folder" className="text-[16px]" />
            Nueva carpeta
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : chats.length === 0 && folders.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8 px-4">
              {archivedMode ? 'Sin chats archivados.' : 'Crea tu primera conversación.'}
            </p>
          ) : (
            <>
              <FolderSection
                sectionKey="__none__"
                label="Sin carpeta"
                items={grouped.get(null) ?? []}
                color={null}
                folder={null}
                isCollapsed={!!collapsed['__none__']}
                folderMenuOpen={false}
                onToggleCollapse={toggleCollapse}
                onToggleFolderMenu={() => {}}
                onEditFolder={() => {}}
                onDeleteFolder={() => {}}
                renderChat={renderChat}
              />
              {folders.map((f) => (
                <FolderSection
                  key={f.id}
                  sectionKey={f.id}
                  label={f.name}
                  items={grouped.get(f.id) ?? []}
                  color={f.color ?? DEFAULT_FOLDER_COLOR}
                  folder={f}
                  isCollapsed={!!collapsed[f.id]}
                  folderMenuOpen={folderMenuId === f.id}
                  onToggleCollapse={toggleCollapse}
                  onToggleFolderMenu={(id) =>
                    setFolderMenuId(folderMenuId === id ? null : id)
                  }
                  onEditFolder={openEditFolder}
                  onDeleteFolder={handleDeleteFolder}
                  renderChat={renderChat}
                />
              ))}
            </>
          )}
        </div>

        <FolderDialog
          open={newFolderOpen}
          editing={editFolder}
          name={folderName}
          color={folderColor}
          saving={createFolder.isPending || updateFolder.isPending}
          onOpenChange={setNewFolderOpen}
          onChangeName={setFolderName}
          onChangeColor={setFolderColor}
          onSave={handleSaveFolder}
        />
      </aside>
    </>
  );
}
