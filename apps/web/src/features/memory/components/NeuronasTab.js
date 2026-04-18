import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle, FileUpload, Input, Skeleton, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, } from '@radikal/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useMemories, useCreateMemory, useUpdateMemory, useDeleteMemory, } from '../api/memory';
import { useAssets, useCreateAsset, useDeleteAsset, } from '@/features/content/api/content';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
function extractTitle(value) {
    const match = value.match(/^\s*#\s+(.+)$/m);
    if (match && match[1]) {
        const title = match[1].trim();
        const body = value.replace(match[0], '').trim();
        return { title, body };
    }
    const firstLine = value.split('\n').find((l) => l.trim().length > 0) ?? 'Nota';
    return { title: firstLine.slice(0, 60), body: value };
}
function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '';
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
function iconForMime(mime) {
    if (!mime)
        return 'description';
    if (mime.includes('pdf'))
        return 'picture_as_pdf';
    if (mime.includes('word') || mime.includes('document'))
        return 'description';
    return 'description';
}
function prettySize(bytes) {
    if (!bytes)
        return '';
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function NeuronasTab({ projectId }) {
    const confirmDialog = useConfirm();
    const [search, setSearch] = useState('');
    const [noteOpen, setNoteOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [draftText, setDraftText] = useState('');
    const notesQ = useMemories(projectId, 'note');
    const docsQ = useAssets(projectId, { type: 'document' });
    const createMemory = useCreateMemory();
    const updateMemory = useUpdateMemory();
    const deleteMemory = useDeleteMemory();
    const notes = useMemo(() => {
        const items = notesQ.data ?? [];
        const q = search.trim().toLowerCase();
        if (!q)
            return items;
        return items.filter((n) => n.value.toLowerCase().includes(q) || (n.key ?? '').toLowerCase().includes(q));
    }, [notesQ.data, search]);
    const docs = useMemo(() => {
        const items = docsQ.data ?? [];
        const q = search.trim().toLowerCase();
        if (!q)
            return items;
        return items.filter((a) => {
            const meta = (a.metadata ?? {});
            const name = (typeof meta.original_name === 'string' ? meta.original_name : '') || a.asset_url;
            return name.toLowerCase().includes(q);
        });
    }, [docsQ.data, search]);
    const openNewNote = () => {
        setEditing(null);
        setDraftText('');
        setNoteOpen(true);
    };
    const openEditNote = (note) => {
        setEditing(note);
        setDraftText(note.value);
        setNoteOpen(true);
    };
    const saveNote = async () => {
        const value = draftText.trim();
        if (!value)
            return;
        if (editing) {
            await updateMemory.mutateAsync({
                id: editing.id,
                project_id: projectId,
                value,
            });
        }
        else {
            await createMemory.mutateAsync({ project_id: projectId, category: 'note', value });
        }
        setNoteOpen(false);
        setDraftText('');
        setEditing(null);
    };
    const removeNote = async (n) => {
        const ok = await confirmDialog({ title: '¿Eliminar esta nota?', variant: 'danger', confirmLabel: 'Eliminar' });
        if (!ok)
            return;
        await deleteMemory.mutateAsync({ id: n.id, project_id: projectId });
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs("div", { className: "flex-1 relative", children: [_jsx("span", { className: "material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]", children: "search" }), _jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar en notas y documentos...", className: "pl-10" })] }) }), _jsxs(Tabs, { defaultValue: "notes", className: "w-full", children: [_jsxs(TabsList, { className: "flex overflow-x-auto scrollbar-hide max-w-full flex-nowrap", children: [_jsx(TabsTrigger, { value: "notes", className: "shrink-0", children: "Recuerdos y notas" }), _jsx(TabsTrigger, { value: "docs", className: "shrink-0", children: "Documentos de marca" })] }), _jsxs(TabsContent, { value: "notes", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4", children: [_jsx("h3", { className: "font-display text-base sm:text-lg font-bold", children: "Recuerdos y notas" }), _jsxs(Button, { onClick: openNewNote, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), "Nueva nota"] })] }), notesQ.isLoading ? (_jsx(Skeleton, { className: "h-48" })) : notes.length === 0 ? (_jsx(Card, { className: "p-6", children: _jsx(CharacterEmpty, { character: "ankor", title: "Aqu\u00ED guardaremos tus ideas", message: "Escr\u00EDbelas sin miedo. Cada nota enriquece la memoria del proyecto y afina mis respuestas.", action: { label: 'Nueva nota', onClick: openNewNote } }) })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4", children: notes.map((n) => {
                                    const { title, body } = extractTitle(n.value);
                                    return (_jsxs(Card, { className: "p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-violet-500", children: "note" }), _jsx("h4", { className: "font-display font-bold text-slate-900 flex-1 truncate", children: title })] }), _jsx("p", { className: "text-xs text-slate-600 line-clamp-3", children: body.slice(0, 200) }), _jsxs("div", { className: "mt-auto pt-3 border-t border-slate-100 flex items-center justify-between", children: [_jsx("span", { className: "text-[11px] text-slate-500", children: formatDate(n.created_at) }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { type: "button", onClick: () => openEditNote(n), className: "p-1.5 rounded-lg hover:bg-slate-100 text-slate-600", "aria-label": "Editar", children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "edit" }) }), _jsx("button", { type: "button", onClick: () => void removeNote(n), className: "p-1.5 rounded-lg hover:bg-red-50 text-red-600", "aria-label": "Eliminar", children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "delete" }) })] })] })] }, n.id));
                                }) }))] }), _jsx(TabsContent, { value: "docs", children: _jsx(DocsSection, { projectId: projectId, docs: docs, loading: docsQ.isLoading }) })] }), _jsx(Dialog, { open: noteOpen, onOpenChange: setNoteOpen, children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: editing ? 'Editar nota' : 'Nueva nota' }) }), _jsxs("div", { className: "space-y-3", children: [_jsxs("p", { className: "text-xs text-slate-500", children: ["Empieza con ", _jsx("code", { className: "bg-slate-100 px-1 rounded", children: "#" }), " para definir un t\u00EDtulo."] }), _jsx(Textarea, { value: draftText, onChange: (e) => setDraftText(e.target.value), placeholder: "# Mi nota\\n\\nContenido...", rows: Math.min(20, Math.max(6, draftText.split('\n').length + 2)), className: "min-h-[220px] font-mono text-sm" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: () => setNoteOpen(false), children: "Cancelar" }), _jsxs(Button, { onClick: () => void saveNote(), disabled: !draftText.trim() || createMemory.isPending || updateMemory.isPending, children: [(createMemory.isPending || updateMemory.isPending) && (_jsx(Spinner, { className: "h-4 w-4 mr-1" })), "Guardar"] })] })] })] }) })] }));
}
function DocsSection({ projectId, docs, loading }) {
    const confirmDialog = useConfirm();
    const { user } = useAuth();
    const createAsset = useCreateAsset();
    const deleteAsset = useDeleteAsset();
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    async function uploadFile(file) {
        if (!user)
            return;
        setUploading(true);
        setUploadError(null);
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const id = crypto.randomUUID();
            const path = `${user.id}/${projectId}/${id}-${safeName}`;
            let publicUrl = null;
            // Try documents bucket first, fall back to assets
            const buckets = ['documents', 'assets'];
            for (const bucket of buckets) {
                const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
                    cacheControl: '3600',
                    upsert: false,
                });
                if (!upErr) {
                    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
                    publicUrl = pub.publicUrl;
                    break;
                }
            }
            if (!publicUrl) {
                setUploadError('No se pudo subir el archivo.');
                return;
            }
            await createAsset.mutateAsync({
                project_id: projectId,
                asset_url: publicUrl,
                asset_type: 'document',
                metadata: {
                    size: file.size,
                    mime_type: file.type,
                    original_name: file.name,
                },
            });
        }
        catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Error desconocido');
        }
        finally {
            setUploading(false);
        }
    }
    const onFiles = (files) => {
        files.forEach((f) => void uploadFile(f));
    };
    const removeDoc = async (a) => {
        const ok = await confirmDialog({ title: '¿Eliminar este documento?', variant: 'danger', confirmLabel: 'Eliminar' });
        if (!ok)
            return;
        await deleteAsset.mutateAsync({ id: a.id, project_id: projectId });
    };
    return (_jsxs("div", { className: "space-y-5", children: [_jsx(FileUpload, { multiple: true, accept: ".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown", label: "Arrastra documentos o haz click para subir", description: "PDF, DOC, DOCX, TXT o MD.", onFilesSelected: onFiles }), uploading && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-slate-600", children: [_jsx(Spinner, { className: "h-4 w-4" }), " Subiendo documento..."] })), uploadError && _jsx("p", { className: "text-sm text-red-600", children: uploadError }), loading ? (_jsx(Skeleton, { className: "h-40" })) : docs.length === 0 ? (_jsx(Card, { className: "p-6", children: _jsx(CharacterEmpty, { character: "ankor", title: "Sin documentos a\u00FAn", message: "Sube briefs, manuales de marca o gu\u00EDas y los consulto cada vez que necesitemos contexto profundo." }) })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4", children: docs.map((a) => {
                    const meta = (a.metadata ?? {});
                    const mime = typeof meta.mime_type === 'string' ? meta.mime_type : undefined;
                    const name = (typeof meta.original_name === 'string' && meta.original_name) ||
                        a.asset_url.split('/').pop() ||
                        'Documento';
                    const size = typeof meta.size === 'number' ? meta.size : undefined;
                    return (_jsxs(Card, { className: "p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "material-symbols-outlined text-pink-500 text-[28px]", children: iconForMime(mime) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h4", { className: "font-display font-bold text-slate-900 truncate", children: name }), _jsxs("p", { className: "text-[11px] text-slate-500", children: [prettySize(size), " \u00B7 ", formatDate(a.created_at)] })] })] }), _jsxs("div", { className: "flex items-center justify-between pt-3 border-t border-slate-100", children: [_jsxs("a", { href: a.asset_url, target: "_blank", rel: "noreferrer noopener", className: "inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-800", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "open_in_new" }), "Ver"] }), _jsx("button", { type: "button", onClick: () => void removeDoc(a), className: "p-1.5 rounded-lg hover:bg-red-50 text-red-600", "aria-label": "Eliminar", children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "delete" }) })] })] }, a.id));
                }) }))] }));
}
