import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Button,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  Input,
  Label,
} from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { cn } from '@/shared/utils/cn';
import { useProject } from '@/providers/ProjectProvider';
import { getAgent } from '../agents';
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

const DEFAULT_COLOR = '#8b5cf6';

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
  const [folderColor, setFolderColor] = useState(DEFAULT_COLOR);

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
    setFolderColor(DEFAULT_COLOR);
    setNewFolderOpen(true);
  };

  const openEditFolder = (f: ChatFolder) => {
    setEditFolder(f);
    setFolderName(f.name);
    setFolderColor(f.color ?? DEFAULT_COLOR);
    setNewFolderOpen(true);
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
    const ok = await confirmDialog({ title: `¿Eliminar la carpeta "${f.name}"? Los chats se moverán a "Sin carpeta".`, variant: 'danger', confirmLabel: 'Eliminar' });
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

  const renderChat = (chat: Chat) => {
    const agent = getAgent(chat.agentId);
    const isActive = chat.id === activeId;
    return (
      <div key={chat.id} className="relative group">
        <button
          type="button"
          onClick={() => handleSelectChat(chat.id)}
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
            setMenuId(menuId === chat.id ? null : chat.id);
            setMoveMenuId(null);
          }}
          aria-label="Opciones de chat"
          className="absolute right-2 top-3 p-1 rounded-md text-slate-400 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>more_horiz</span>
        </button>
        {menuId === chat.id && (
          <div className="absolute right-2 top-10 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-44">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMoveMenuId(moveMenuId === chat.id ? null : chat.id);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">drive_file_move</span>
              Mover a...
            </button>
            <button
              type="button"
              onClick={() => {
                archive.mutate({ id: chat.id, archived: !chat.isArchived });
                setMenuId(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">
                {chat.isArchived ? 'unarchive' : 'archive'}
              </span>
              {chat.isArchived ? 'Desarchivar' : 'Archivar'}
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await confirmDialog({ title: '¿Eliminar esta conversación?', variant: 'danger', confirmLabel: 'Eliminar' });
                if (ok) del.mutate(chat.id);
                setMenuId(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Eliminar
            </button>
          </div>
        )}
        {moveMenuId === chat.id && (
          <div className="absolute right-2 top-10 z-30 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-48 max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                moveChat.mutate({ id: chat.id, folder_id: null });
                setMoveMenuId(null);
                setMenuId(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">folder_off</span>
              Sin carpeta
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  moveChat.mutate({ id: chat.id, folder_id: f.id });
                  setMoveMenuId(null);
                  setMenuId(null);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: f.color ?? DEFAULT_COLOR }}
                />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (
    key: string,
    label: string,
    items: Chat[],
    color: string | null,
    folder: ChatFolder | null,
  ) => {
    const isCollapsed = !!collapsed[key];
    return (
      <div key={key} className="mb-3">
        <div className="flex items-center gap-1 px-2 py-1 group/section">
          <button
            type="button"
            onClick={() => toggleCollapse(key)}
            className="flex-1 flex items-center gap-2 text-left"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-400">
              {isCollapsed ? 'chevron_right' : 'expand_more'}
            </span>
            {color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: color }}
              />
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
                  setFolderMenuId(folderMenuId === folder.id ? null : folder.id);
                }}
                aria-label="Opciones de carpeta"
                className="p-1 rounded-md text-slate-400 hover:bg-slate-200 opacity-0 group-hover/section:opacity-100"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden>more_horiz</span>
              </button>
              {folderMenuId === folder.id && (
                <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-36">
                  <button
                    type="button"
                    onClick={() => {
                      openEditFolder(folder);
                      setFolderMenuId(null);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFolder(folder)}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
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
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
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
      {/* Mobile close button */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button onClick={() => { onNew(); onMobileClose?.(); }} className="flex-1 justify-center">
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="ml-1">Nueva conversación</span>
        </Button>
        <button
          type="button"
          onClick={onMobileClose}
          className="ml-2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 md:hidden"
          aria-label="Cerrar menú"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
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
          <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
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
            {renderSection('__none__', 'Sin carpeta', grouped.get(null) ?? [], null, null)}
            {folders.map((f) =>
              renderSection(f.id, f.name, grouped.get(f.id) ?? [], f.color ?? DEFAULT_COLOR, f),
            )}
          </>
        )}
      </div>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFolder ? 'Editar carpeta' : 'Nueva carpeta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Ej: Campaña 2026"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={folderColor}
                  onChange={(e) => setFolderColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <span className="text-xs text-slate-500">{folderColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewFolderOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveFolder}
              disabled={!folderName.trim() || createFolder.isPending || updateFolder.isPending}
            >
              {editFolder ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
    </>
  );
}
