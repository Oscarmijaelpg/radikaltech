
import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Chat, ProjectFolder } from '../../../core/domain/entities';
import { useAuth } from '../../context/AuthContext';
import { useProjectContext } from '../../context/ProjectContext';
import { useDeleteChat } from '../../hooks/useChat';
import { useWallet } from '../../hooks/useTokens';
import { ARCHIVE_MENU_ITEMS } from '../../utils/menuConfig';
import { DeleteChatModal } from '../chat/DeleteChatModal';
import { ProjectModal } from '../projects/ProjectModal';
import { FolderModal, FOLDER_COLORS } from '../folders/FolderModal';
import { MoveChatModal } from '../folders/MoveChatModal';
import {
  useProjectFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveChatToFolder,
} from '../../hooks/useProjectFolders';

interface SidebarProps {
  conversations: Chat[];
  onOpenNewChat: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  onOpenNewChat,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { activeProject, projects, setActiveProjectId } = useProjectContext();
  const { mutate: deleteChat } = useDeleteChat();
  const { data: wallet } = useWallet();

  // Folder queries
  const { data: folders = [] } = useProjectFolders(user?.id, activeProject?.id);
  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const moveChatMutation = useMoveChatToFolder();

  // UI state
  const [isMisNeuronasOpen, setIsMisNeuronasOpen] = React.useState(true);
  const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set());
  const [chatToDelete, setChatToDelete] = React.useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = React.useState(false);
  const [editingFolder, setEditingFolder] = React.useState<ProjectFolder | null>(null);
  
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);
  const projectDropdownRef = React.useRef<HTMLDivElement>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<boolean>(false);

  // Move chat modal state
  const [movingChat, setMovingChat] = React.useState<Chat | null>(null);

  // Folder context menu
  const [folderMenu, setFolderMenu] = React.useState<{ folderId: string; x: number; y: number } | null>(null);
  const folderMenuRef = React.useRef<HTMLDivElement>(null);

  // Chat context menu (right-click on chat)
  const [chatMenu, setChatMenu] = React.useState<{ chat: Chat; x: number; y: number } | null>(null);
  const chatMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menus on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
        setFolderMenu(null);
      }
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setChatMenu(null);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const filteredChats = conversations.filter(
    c => !c.title.includes('Dirección creativa imagen Libertario')
  );

  const chatsInFolder = (folderId: string) => filteredChats.filter(c => c.folder_id === folderId);
  const unassignedChats = filteredChats.filter(c => !c.folder_id);

  const handleFolderRightClick = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderMenu({ folderId, x: e.clientX, y: e.clientY });
    setChatMenu(null);
  };

  const handleChatMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    e.stopPropagation();
    setChatMenu({ chat, x: e.clientX, y: e.clientY });
    setFolderMenu(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!user || !activeProject) return;
    deleteFolderMutation.mutate({ folderId, userId: user.id, projectId: activeProject.id });
    setFolderMenu(null);
  };

  const handleEditFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setEditingFolder(folder);
      setIsFolderModalOpen(true);
    }
    setFolderMenu(null);
  };

  const handleSaveFolder = (data: { name: string; color: string; icon: string; description?: string }) => {
    if (!user || !activeProject) return;
    if (editingFolder) {
      updateFolderMutation.mutate(
        { folderId: editingFolder.id, userId: user.id, projectId: activeProject.id, updates: data },
        { onSuccess: () => { setIsFolderModalOpen(false); setEditingFolder(null); } }
      );
    } else {
      createFolderMutation.mutate(
        { userId: user.id, projectId: activeProject.id, ...data },
        { onSuccess: () => setIsFolderModalOpen(false) }
      );
    }
  };

  const handleMoveChat = (folderId: string | null) => {
    if (!movingChat || !user || !activeProject) return;
    moveChatMutation.mutate(
      { chatId: movingChat.id, folderId, userId: user.id, projectId: activeProject.id },
      { onSuccess: () => setMovingChat(null) }
    );
  };

  const linkClass = ({ isActive }: { isActive: boolean }) => `
    flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm font-medium w-full
    ${isActive
      ? 'bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))]'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
  `;

  const colorConfig = (colorId: string) =>
    FOLDER_COLORS.find(c => c.id === colorId) || FOLDER_COLORS[6];

  const renderChatItem = (chat: Chat) => (
    <div key={chat.id} className="group relative">
      <NavLink to={`/chat/${chat.id}`} className={linkClass}>
        <span className="material-symbols-outlined text-base shrink-0 text-slate-400 group-hover:text-[hsl(var(--color-primary))] transition-colors">
          chat_bubble_outline
        </span>
        <div className="flex flex-1 items-center gap-1.5 min-w-0 pr-7 rounded-md">
          <span className="truncate text-sm">{chat.title}</span>
          {chat.linked_chat_id && (
            <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-[13px] shrink-0" title="Vinculado con otro chat">
              link
            </span>
          )}
        </div>
      </NavLink>
      <button
        onClick={e => handleChatMenu(e, chat)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
        title="Opciones"
      >
        <span className="material-symbols-outlined text-base">more_horiz</span>
      </button>
    </div>
  );

  return (
    <>
      <aside className="w-72 h-full min-h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <img
                src="https://i.ibb.co/NgHmpDKp/Sin-t-tulo-1.png"
                alt="Radikal AI Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* Project Switcher Custom Dropdown */}
          <div className="mb-6 relative" ref={projectDropdownRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Proyecto (Workspace)</label>
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-left text-slate-800 text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-colors shadow-sm"
            >
              <span className="truncate pr-2">{activeProject?.name || 'Seleccionar Proyecto'}</span>
              <span className={`material-symbols-outlined text-slate-500 transition-transform duration-200 ${isProjectDropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActiveProjectId(p.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between group ${activeProject?.id === p.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className="truncate">{p.name}</span>
                      {activeProject?.id === p.id && (
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="border-t border-slate-100 p-1 bg-slate-50">
                  <button
                    onClick={() => {
                      setEditingProject(false);
                      setIsProjectModalOpen(true);
                      setIsProjectDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nuevo Proyecto
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject(true);
                      setIsProjectModalOpen(true);
                      setIsProjectDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 mt-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    Configurar Proyecto
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onOpenNewChat}
            className="w-full bg-slate-900 text-white rounded-xl px-4 py-3 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nueva Tarea
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar space-y-4 pb-4">

          {/* Herramientas */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
            <button
              onClick={() => setIsMisNeuronasOpen(!isMisNeuronasOpen)}
              className="flex items-center justify-between w-full px-3 py-3 rounded-xl transition-all hover:bg-slate-100 group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-[hsl(var(--color-primary))]">psychology</span>
                <span className="text-base font-bold text-slate-900">Herramientas</span>
              </div>
              <span className={`material-symbols-outlined transition-transform duration-200 text-slate-400 ${isMisNeuronasOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {isMisNeuronasOpen && (
              <div className="pl-12 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-200">
                {ARCHIVE_MENU_ITEMS.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={() => {
                      const isAtHome = location.pathname === '/';
                      const isActive =
                        item.tab
                          ? (item.tab === 'news' && isAtHome && location.search.includes('tab=news')) ||
                            (item.tab === 'competition' && isAtHome && location.search.includes('tab=competition')) ||
                            (item.tab === 'brand' && isAtHome && (location.search.includes('tab=brand') || !location.search)) ||
                            (item.tab === 'neuronas' && isAtHome && location.search.includes('tab=neuronas')) ||
                            (item.tab === 'content' && location.pathname === '/content') ||
                            (item.tab === 'team' && location.pathname === '/team')
                          : false;
                      return `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium w-full ${
                        isActive
                          ? 'text-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)]'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`;
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Proyectos (Folders) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Proyectos</p>
              <button
                onClick={() => { setEditingFolder(null); setIsFolderModalOpen(true); }}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title="Nueva carpeta"
              >
                <span className="material-symbols-outlined text-base">create_new_folder</span>
              </button>
            </div>

            {folders.length === 0 && (
              <button
                onClick={() => { setEditingFolder(null); setIsFolderModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all text-sm border border-dashed border-slate-200 hover:border-slate-300"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Crear primera carpeta</span>
              </button>
            )}

            {folders.map(folder => {
              const isOpen = openFolders.has(folder.id);
              const folderChats = chatsInFolder(folder.id);
              const color = colorConfig(folder.color);

              return (
                <div key={folder.id}>
                  <div
                    className="group flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer select-none"
                    onClick={() => toggleFolder(folder.id)}
                    onContextMenu={e => handleFolderRightClick(e, folder.id)}
                  >
                    {/* Folder icon badge */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color.bg}`}>
                      <span className="material-symbols-outlined text-white text-sm">{folder.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{folder.name}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {folderChats.length > 0 && (
                        <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          {folderChats.length}
                        </span>
                      )}
                      {/* Options button */}
                      <button
                        onClick={e => { e.stopPropagation(); handleFolderRightClick(e, folder.id); }}
                        className="p-0.5 rounded text-slate-300 hover:text-slate-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                        title="Opciones"
                      >
                        <span className="material-symbols-outlined text-sm">more_horiz</span>
                      </button>
                      <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Chats dentro de la carpeta */}
                  {isOpen && (
                    <div className="pl-3 mt-0.5 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                      {folderChats.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400 italic">Sin chats en esta carpeta</p>
                      ) : (
                        folderChats.map(chat => renderChatItem(chat))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chats sin carpeta */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-3 mb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chats Recientes</p>
            </div>

            {unassignedChats.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-slate-400">No hay conversaciones recientes</p>
              </div>
            ) : (
              unassignedChats.map(chat => renderChatItem(chat))
            )}
          </div>
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          {(user?.role === 'admin' || user?.rol === 'admin') && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `
                w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all text-sm font-bold shadow-sm border
                ${isActive
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}
              `}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                <span>Administración</span>
              </div>
            </NavLink>
          )}

          <NavLink
            to="/tokens"
            className={({ isActive }) => `
              w-full flex items-center justify-between px-3 py-3 rounded-lg transition-all text-sm font-bold shadow-sm border
              ${isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}
            `}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-[hsl(var(--color-primary))]">account_balance_wallet</span>
              <span>Mi Billetera v1.0.4</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">
              <span>🪙</span>
              <span>{wallet?.balance?.toLocaleString() || 0}</span>
            </div>
          </NavLink>

          <div className="pt-2 border-t border-slate-100 space-y-1">
            <a
              href="https://api.whatsapp.com/send?phone=573123069415&text=Hola%20Radikal%20Team"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-[#25D366]/10 hover:text-[#128C7E] transition-all text-sm font-medium group"
            >
              <span className="material-symbols-outlined text-xl group-hover:text-[#128C7E]">support_agent</span>
              Soporte WhatsApp
            </a>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all text-sm group"
            >
              <span className="material-symbols-outlined text-xl group-hover:text-red-600">logout</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Delete Chat Modal */}
      <DeleteChatModal
        isOpen={!!chatToDelete}
        onClose={() => setChatToDelete(null)}
        onConfirm={async () => {
          if (!chatToDelete) return;
          setIsDeleting(true);
          try {
            await deleteChat(chatToDelete.id);
            if (location.pathname === `/chat/${chatToDelete.id}`) navigate('/');
            setChatToDelete(null);
          } catch (error) {
            console.error('Error deleting chat:', error);
          } finally {
            setIsDeleting(false);
          }
        }}
        chatTitle={chatToDelete?.title}
        isLoading={isDeleting}
      />

      {/* Folder Create/Edit Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => { setIsFolderModalOpen(false); setEditingFolder(null); }}
        onSave={handleSaveFolder}
        isLoading={createFolderMutation.isPending || updateFolderMutation.isPending}
        folder={editingFolder}
      />

      {/* Move Chat Modal */}
      <MoveChatModal
        isOpen={!!movingChat}
        onClose={() => setMovingChat(null)}
        onMove={handleMoveChat}
        folders={folders}
        chat={movingChat}
        isLoading={moveChatMutation.isPending}
      />

      {/* Folder Context Menu */}
      {folderMenu && (
        <div
          ref={folderMenuRef}
          className="fixed z-[200] bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px] animate-in zoom-in-95 duration-100"
          style={{ top: folderMenu.y, left: folderMenu.x }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => handleEditFolder(folderMenu.folderId)}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base text-slate-500">edit</span>
            Editar carpeta
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            onClick={() => handleDeleteFolder(folderMenu.folderId)}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Eliminar carpeta
          </button>
        </div>
      )}

      {/* Chat Options Menu */}
      {chatMenu && (
        <div
          ref={chatMenuRef}
          className="fixed z-[200] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[180px] animate-in zoom-in-95 duration-100"
          style={{ top: chatMenu.y, left: chatMenu.x }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setMovingChat(chatMenu.chat); setChatMenu(null); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base text-slate-500">drive_file_move</span>
            Mover a carpeta
          </button>
          <div className="border-t border-slate-100 mx-2" />
          <button
            onClick={() => { setChatToDelete({ id: chatMenu.chat.id, title: chatMenu.chat.title }); setChatMenu(null); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Eliminar chat
          </button>
        </div>
      )}

      {/* Project Modal */}
      <ProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        project={editingProject ? activeProject : null}
      />
    </>
  );
};
