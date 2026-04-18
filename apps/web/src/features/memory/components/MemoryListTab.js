import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Skeleton, Spinner, Textarea, } from '@radikal/ui';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useCreateMemory, useDeleteMemory, useMemories, useUpdateMemory, } from '../api/memory';
export function MemoryListTab({ projectId, category, labels }) {
    const { data: items, isLoading } = useMemories(projectId, category);
    const create = useCreateMemory();
    const update = useUpdateMemory();
    const remove = useDeleteMemory();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const openCreate = () => {
        setEditing(null);
        setName('');
        setDescription('');
        setOpen(true);
    };
    const openEdit = (item) => {
        setEditing(item);
        setName(item.key ?? '');
        setDescription(item.value);
        setOpen(true);
    };
    const onSave = async () => {
        if (!description.trim())
            return;
        if (editing) {
            await update.mutateAsync({
                id: editing.id,
                project_id: projectId,
                key: name,
                value: description,
            });
        }
        else {
            await create.mutateAsync({
                project_id: projectId,
                category,
                key: name,
                value: description,
            });
        }
        setOpen(false);
    };
    const onDelete = async (id) => {
        await remove.mutateAsync({ id, project_id: projectId });
    };
    if (isLoading) {
        return _jsx(Skeleton, { className: "h-48" });
    }
    const saving = create.isPending || update.isPending;
    return (_jsxs("div", { className: "space-y-5", children: [_jsx("div", { className: "flex justify-end", children: _jsxs(Button, { onClick: openCreate, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), labels.addButton] }) }), !items || items.length === 0 ? (_jsx(Card, { className: "p-6", children: _jsx(CharacterEmpty, { character: labels.character ?? 'ankor', title: labels.emptyTitle, message: labels.emptyDescription, action: { label: labels.addButton, onClick: openCreate } }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: items.map((item) => (_jsxs(Card, { className: "p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 mb-2", children: [_jsx("h3", { className: "font-display font-bold text-lg text-slate-900", children: item.key || 'Sin título' }), _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => openEdit(item), "aria-label": "Editar", children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "edit" }) }), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => onDelete(item.id), "aria-label": "Eliminar", children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "delete" }) })] })] }), _jsx("p", { className: "text-sm text-slate-600 whitespace-pre-wrap", children: item.value })] }, item.id))) })), _jsx(Dialog, { open: open, onOpenChange: setOpen, children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-lg h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: editing ? `Editar: ${editing.key || ''}` : labels.dialogTitle }) }), _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: labels.nameLabel, value: name, onChange: (e) => setName(e.target.value) }), _jsx(Textarea, { label: labels.descriptionLabel, value: description, onChange: (e) => setDescription(e.target.value) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }), _jsx(Button, { onClick: onSave, disabled: saving || !description.trim(), children: saving ? _jsx(Spinner, {}) : 'Guardar' })] })] }) })] }));
}
