import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { FileUpload, Card, Spinner, Badge, Button } from '@radikal/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { useCreateAsset, useEvaluateAsset, } from '../api/content';
function mimeToAssetType(mime) {
    if (mime.startsWith('image/'))
        return 'image';
    if (mime.startsWith('video/'))
        return 'video';
    if (mime.startsWith('audio/'))
        return 'audio';
    if (mime === 'application/pdf' || mime.startsWith('application/'))
        return 'document';
    return null;
}
export function AssetUploader() {
    const { user } = useAuth();
    const { activeProject } = useProject();
    const [items, setItems] = useState([]);
    const createAsset = useCreateAsset();
    const evaluateAsset = useEvaluateAsset();
    const updateItem = (id, patch) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    async function handleOneFile(file) {
        if (!user || !activeProject)
            return;
        const id = crypto.randomUUID();
        setItems((prev) => [
            ...prev,
            { id, file, status: 'uploading', progress: 0 },
        ]);
        try {
            const assetType = mimeToAssetType(file.type);
            if (!assetType) {
                updateItem(id, { status: 'error', error: 'Tipo de archivo no soportado' });
                return;
            }
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${user.id}/${activeProject.id}/${id}-${safeName}`;
            const { error: upErr } = await supabase.storage
                .from('assets')
                .upload(path, file, { cacheControl: '3600', upsert: false });
            if (upErr) {
                updateItem(id, { status: 'error', error: upErr.message });
                return;
            }
            const { data: pub } = supabase.storage.from('assets').getPublicUrl(path);
            const publicUrl = pub.publicUrl;
            updateItem(id, { status: 'creating', progress: 60 });
            const asset = await createAsset.mutateAsync({
                project_id: activeProject.id,
                asset_url: publicUrl,
                asset_type: assetType,
                metadata: {
                    size: file.size,
                    mime_type: file.type,
                    original_name: file.name,
                },
            });
            updateItem(id, { status: 'evaluating', progress: 80, asset_id: asset.id });
            if (assetType === 'image') {
                try {
                    await evaluateAsset.mutateAsync({ id: asset.id, project_id: activeProject.id });
                }
                catch {
                    // evaluation failure shouldn't prevent upload from being considered successful
                }
            }
            updateItem(id, { status: 'done', progress: 100 });
        }
        catch (err) {
            updateItem(id, {
                status: 'error',
                error: err instanceof Error ? err.message : 'Error desconocido',
            });
        }
    }
    const onFiles = (files) => {
        files.forEach((f) => {
            void handleOneFile(f);
        });
    };
    const clearCompleted = () => setItems((prev) => prev.filter((it) => it.status !== 'done' && it.status !== 'error'));
    if (!activeProject) {
        return (_jsx(Card, { className: "p-8 text-center text-sm text-slate-500", children: "Selecciona un proyecto para subir assets." }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(FileUpload, { multiple: true, accept: "image/*,video/*,application/pdf", label: "Arrastra o selecciona im\u00E1genes, videos o PDFs", description: "Las im\u00E1genes se eval\u00FAan autom\u00E1ticamente con IA.", onFilesSelected: onFiles }), items.length > 0 && (_jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "font-display text-lg font-bold", children: "Progreso de subida" }), _jsx(Button, { variant: "ghost", onClick: clearCompleted, children: "Limpiar completados" })] }), _jsx("ul", { className: "flex flex-col gap-3", children: items.map((it) => (_jsxs("li", { className: "flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium truncate", children: it.file.name }), _jsx("div", { className: "mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden", children: _jsx("div", { className: it.status === 'error'
                                                    ? 'h-full bg-red-500'
                                                    : 'h-full bg-amber-500 transition-all duration-300', style: { width: `${it.progress}%` } }) }), it.error && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: it.error }))] }), _jsxs("div", { className: "shrink-0", children: [it.status === 'uploading' && (_jsxs(Badge, { variant: "outline", children: [_jsx(Spinner, { className: "h-3 w-3 mr-1" }), " Subiendo"] })), it.status === 'creating' && (_jsxs(Badge, { variant: "outline", children: [_jsx(Spinner, { className: "h-3 w-3 mr-1" }), " Registrando"] })), it.status === 'evaluating' && (_jsxs(Badge, { variant: "outline", children: [_jsx(Spinner, { className: "h-3 w-3 mr-1" }), " Evaluando IA"] })), it.status === 'done' && _jsx(Badge, { children: "Listo" }), it.status === 'error' && _jsx(Badge, { variant: "destructive", children: "Error" })] })] }, it.id))) })] }))] }));
}
