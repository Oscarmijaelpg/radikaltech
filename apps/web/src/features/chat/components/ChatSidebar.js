import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Spinner, Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, Input, Label, } from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { cn } from '@/shared/utils/cn';
import { useProject } from '@/providers/ProjectProvider';
import { getAgent } from '../agents';
import { useArchiveChat, useDeleteChat, useChatFolders, useCreateFolder, useUpdateFolder, useDeleteFolder, useMoveChat, } from '../api/chat';
const DEFAULT_COLOR = '#8b5cf6';
export function ChatSidebar({ chats, loading, activeId, archivedMode, onToggleArchivedMode, onSelect, onNew, mobileOpen, onMobileClose, }) {
    const confirmDialog = useConfirm();
    const { activeProject } = useProject();
    const foldersQ = useChatFolders(activeProject?.id ?? null);
    const createFolder = useCreateFolder();
    const updateFolder = useUpdateFolder();
    const deleteFolder = useDeleteFolder();
    const moveChat = useMoveChat();
    const archive = useArchiveChat();
    const del = useDeleteChat();
    const [menuId, setMenuId] = useState(null);
    const [moveMenuId, setMoveMenuId] = useState(null);
    const [folderMenuId, setFolderMenuId] = useState(null);
    const [collapsed, setCollapsed] = useState({});
    const [newFolderOpen, setNewFolderOpen] = useState(false);
    const [editFolder, setEditFolder] = useState(null);
    const [folderName, setFolderName] = useState('');
    const [folderColor, setFolderColor] = useState(DEFAULT_COLOR);
    const folders = foldersQ.data ?? [];
    const grouped = useMemo(() => {
        const map = new Map();
        map.set(null, []);
        for (const f of folders)
            map.set(f.id, []);
        for (const c of chats) {
            const key = c.folderId ?? null;
            if (!map.has(key))
                map.set(null, map.get(null) ?? []);
            (map.get(key) ?? map.get(null)).push(c);
        }
        return map;
    }, [chats, folders]);
    const openNewFolder = () => {
        setEditFolder(null);
        setFolderName('');
        setFolderColor(DEFAULT_COLOR);
        setNewFolderOpen(true);
    };
    const openEditFolder = (f) => {
        setEditFolder(f);
        setFolderName(f.name);
        setFolderColor(f.color ?? DEFAULT_COLOR);
        setNewFolderOpen(true);
    };
    const handleSaveFolder = async () => {
        const name = folderName.trim();
        if (!name)
            return;
        if (editFolder) {
            await updateFolder.mutateAsync({ id: editFolder.id, name, color: folderColor });
        }
        else {
            await createFolder.mutateAsync({
                project_id: activeProject?.id ?? null,
                name,
                color: folderColor,
            });
        }
        setNewFolderOpen(false);
    };
    const handleDeleteFolder = async (f) => {
        const ok = await confirmDialog({ title: `¿Eliminar la carpeta "${f.name}"? Los chats se moverán a "Sin carpeta".`, variant: 'danger', confirmLabel: 'Eliminar' });
        if (!ok)
            return;
        await deleteFolder.mutateAsync(f.id);
        setFolderMenuId(null);
    };
    const toggleCollapse = (id) => {
        setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
    };
    const handleSelectChat = (id) => {
        onSelect(id);
        onMobileClose?.();
    };
    const renderChat = (chat) => {
        const agent = getAgent(chat.agentId);
        const isActive = chat.id === activeId;
        return (_jsxs("div", { className: "relative group", children: [_jsxs("button", { type: "button", onClick: () => handleSelectChat(chat.id), className: cn('w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors mb-1', isActive ? 'bg-[hsl(var(--color-primary)/0.08)]' : 'hover:bg-slate-100'), children: [_jsx("div", { className: "w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0", children: agent && (_jsx("img", { src: agent.image, alt: agent.name, className: "w-full h-full object-cover" })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-semibold text-slate-800 truncate", children: chat.title ?? 'Sin título' }), _jsxs("p", { className: "text-[11px] text-slate-400 truncate", children: [agent?.name ?? 'Agente', " \u00B7", ' ', formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true, locale: es })] })] })] }), _jsx("button", { type: "button", onClick: (e) => {
                        e.stopPropagation();
                        setMenuId(menuId === chat.id ? null : chat.id);
                        setMoveMenuId(null);
                    }, "aria-label": "Opciones de chat", className: "absolute right-2 top-3 p-1 rounded-md text-slate-400 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", "aria-hidden": true, children: "more_horiz" }) }), menuId === chat.id && (_jsxs("div", { className: "absolute right-2 top-10 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-44", children: [_jsxs("button", { type: "button", onClick: (e) => {
                                e.stopPropagation();
                                setMoveMenuId(moveMenuId === chat.id ? null : chat.id);
                            }, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "drive_file_move" }), "Mover a..."] }), _jsxs("button", { type: "button", onClick: () => {
                                archive.mutate({ id: chat.id, archived: !chat.isArchived });
                                setMenuId(null);
                            }, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: chat.isArchived ? 'unarchive' : 'archive' }), chat.isArchived ? 'Desarchivar' : 'Archivar'] }), _jsxs("button", { type: "button", onClick: async () => {
                                const ok = await confirmDialog({ title: '¿Eliminar esta conversación?', variant: 'danger', confirmLabel: 'Eliminar' });
                                if (ok)
                                    del.mutate(chat.id);
                                setMenuId(null);
                            }, className: "w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "delete" }), "Eliminar"] })] })), moveMenuId === chat.id && (_jsxs("div", { className: "absolute right-2 top-10 z-30 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-48 max-h-60 overflow-y-auto", children: [_jsxs("button", { type: "button", onClick: () => {
                                moveChat.mutate({ id: chat.id, folder_id: null });
                                setMoveMenuId(null);
                                setMenuId(null);
                            }, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "folder_off" }), "Sin carpeta"] }), folders.map((f) => (_jsxs("button", { type: "button", onClick: () => {
                                moveChat.mutate({ id: chat.id, folder_id: f.id });
                                setMoveMenuId(null);
                                setMenuId(null);
                            }, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "w-3 h-3 rounded-full shrink-0", style: { background: f.color ?? DEFAULT_COLOR } }), _jsx("span", { className: "truncate", children: f.name })] }, f.id)))] }))] }, chat.id));
    };
    const renderSection = (key, label, items, color, folder) => {
        const isCollapsed = !!collapsed[key];
        return (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex items-center gap-1 px-2 py-1 group/section", children: [_jsxs("button", { type: "button", onClick: () => toggleCollapse(key), className: "flex-1 flex items-center gap-2 text-left", children: [_jsx("span", { className: "material-symbols-outlined text-[16px] text-slate-400", children: isCollapsed ? 'chevron_right' : 'expand_more' }), color && (_jsx("span", { className: "w-2.5 h-2.5 rounded-full shrink-0", style: { background: color } })), _jsx("span", { className: "text-[11px] font-black uppercase tracking-wider text-slate-500 truncate", children: label }), _jsxs("span", { className: "text-[10px] font-bold text-slate-400", children: ["(", items.length, ")"] })] }), folder && (_jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: (e) => {
                                        e.stopPropagation();
                                        setFolderMenuId(folderMenuId === folder.id ? null : folder.id);
                                    }, "aria-label": "Opciones de carpeta", className: "p-1 rounded-md text-slate-400 hover:bg-slate-200 opacity-0 group-hover/section:opacity-100", children: _jsx("span", { className: "material-symbols-outlined text-[14px]", "aria-hidden": true, children: "more_horiz" }) }), folderMenuId === folder.id && (_jsxs("div", { className: "absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-36", children: [_jsxs("button", { type: "button", onClick: () => {
                                                openEditFolder(folder);
                                                setFolderMenuId(null);
                                            }, className: "w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "edit" }), "Editar"] }), _jsxs("button", { type: "button", onClick: () => handleDeleteFolder(folder), className: "w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "delete" }), "Eliminar"] })] }))] }))] }), !isCollapsed &&
                    (items.length === 0 ? (_jsx("p", { className: "text-[11px] text-slate-300 px-3 py-1", children: "Vac\u00EDo" })) : (items.map(renderChat)))] }, key));
    };
    return (_jsxs(_Fragment, { children: [mobileOpen && (_jsx("div", { className: "fixed inset-0 z-40 bg-black/40 md:hidden", onClick: onMobileClose })), _jsxs("aside", { className: cn('fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-slate-200 bg-white/95 backdrop-blur-xl flex flex-col h-full transition-transform duration-300 ease-in-out', 'md:static md:z-auto md:translate-x-0 md:w-64 lg:w-72', mobileOpen ? 'translate-x-0' : '-translate-x-full'), children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-slate-200", children: [_jsxs(Button, { onClick: () => { onNew(); onMobileClose?.(); }, className: "flex-1 justify-center", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), _jsx("span", { className: "ml-1", children: "Nueva conversaci\u00F3n" })] }), _jsx("button", { type: "button", onClick: onMobileClose, className: "ml-2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 md:hidden", "aria-label": "Cerrar men\u00FA", children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: "close" }) })] }), _jsxs("div", { className: "px-3 pt-3 pb-2 flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => onToggleArchivedMode(false), className: cn('flex-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors', !archivedMode ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'), children: "Activas" }), _jsx("button", { type: "button", onClick: () => onToggleArchivedMode(true), className: cn('flex-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors', archivedMode ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'), children: "Archivadas" })] }), _jsx("div", { className: "px-3 pb-2", children: _jsxs("button", { type: "button", onClick: openNewFolder, className: "w-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "create_new_folder" }), "Nueva carpeta"] }) }), _jsx("div", { className: "flex-1 overflow-y-auto px-2 pb-4", children: loading ? (_jsx("div", { className: "flex justify-center py-6", children: _jsx(Spinner, { size: "sm" }) })) : chats.length === 0 && folders.length === 0 ? (_jsx("p", { className: "text-center text-xs text-slate-400 py-8 px-4", children: archivedMode ? 'Sin chats archivados.' : 'Crea tu primera conversación.' })) : (_jsxs(_Fragment, { children: [renderSection('__none__', 'Sin carpeta', grouped.get(null) ?? [], null, null), folders.map((f) => renderSection(f.id, f.name, grouped.get(f.id) ?? [], f.color ?? DEFAULT_COLOR, f))] })) }), _jsx(Dialog, { open: newFolderOpen, onOpenChange: setNewFolderOpen, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: editFolder ? 'Editar carpeta' : 'Nueva carpeta' }) }), _jsxs("div", { className: "space-y-4 py-2", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Nombre" }), _jsx(Input, { value: folderName, onChange: (e) => setFolderName(e.target.value), placeholder: "Ej: Campa\u00F1a 2026", autoFocus: true })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Color" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("input", { type: "color", value: folderColor, onChange: (e) => setFolderColor(e.target.value), className: "w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" }), _jsx("span", { className: "text-xs text-slate-500", children: folderColor })] })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => setNewFolderOpen(false), children: "Cancelar" }), _jsx(Button, { type: "button", onClick: handleSaveFolder, disabled: !folderName.trim() || createFolder.isPending || updateFolder.isPending, children: editFolder ? 'Guardar' : 'Crear' })] })] }) })] })] }));
}
