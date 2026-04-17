import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Spinner, Checkbox, FileUpload, Badge, } from '@radikal/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAssets, useCreateAsset, useEvaluateAsset } from '../api/content';
export function ReferencePicker({ open, onOpenChange, projectId, initialSelectedIds, maxSelection = 6, onConfirm, }) {
    const { user } = useAuth();
    const list = useAssets(projectId, { type: 'image', sort: 'recent' });
    const createAsset = useCreateAsset();
    const evaluateAsset = useEvaluateAsset();
    const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    useEffect(() => {
        if (open)
            setSelectedIds(initialSelectedIds);
    }, [open, initialSelectedIds]);
    const assets = list.data ?? [];
    const assetById = useMemo(() => {
        const m = new Map();
        for (const a of assets)
            m.set(a.id, a);
        return m;
    }, [assets]);
    const toggle = (id) => {
        setSelectedIds((prev) => {
            if (prev.includes(id))
                return prev.filter((x) => x !== id);
            if (prev.length >= maxSelection)
                return prev;
            return [...prev, id];
        });
    };
    const handleConfirm = () => {
        const picked = [];
        for (const id of selectedIds) {
            const a = assetById.get(id);
            if (a)
                picked.push(a);
        }
        onConfirm(picked);
        onOpenChange(false);
    };
    const handleUpload = async (files) => {
        if (!projectId || !user || files.length === 0)
            return;
        const file = files[0];
        if (!file)
            return;
        if (!file.type.startsWith('image/')) {
            setUploadError('Solo imágenes');
            return;
        }
        setUploadError(null);
        setUploading(true);
        try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;
            const { error: upErr } = await supabase.storage
                .from('assets')
                .upload(path, file, { cacheControl: '3600', upsert: false });
            if (upErr)
                throw upErr;
            const { data: pub } = supabase.storage.from('assets').getPublicUrl(path);
            const asset = await createAsset.mutateAsync({
                project_id: projectId,
                asset_url: pub.publicUrl,
                asset_type: 'image',
                metadata: {
                    size: file.size,
                    mime_type: file.type,
                    original_name: file.name,
                    source: 'reference_picker',
                },
            });
            // Auto-select
            setSelectedIds((prev) => prev.includes(asset.id) || prev.length >= maxSelection ? prev : [...prev, asset.id]);
            // Best effort evaluate (non-blocking)
            void evaluateAsset.mutateAsync({ id: asset.id, project_id: projectId }).catch(() => { });
            await list.refetch();
        }
        catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Error al subir');
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-3xl", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: ["Elegir referencias", _jsx("span", { className: "inline-flex items-center text-slate-400 cursor-help", title: "Las referencias gu\u00EDan visualmente a la IA para generar im\u00E1genes coherentes", "aria-label": "Las referencias gu\u00EDan visualmente a la IA para generar im\u00E1genes coherentes", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "info" }) })] }), _jsxs(DialogDescription, { children: ["Selecciona hasta ", maxSelection, " im\u00E1genes de tu galer\u00EDa para guiar a la IA."] })] }), _jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs(Badge, { variant: "muted", children: [selectedIds.length, " / ", maxSelection, " seleccionadas"] }), _jsx("div", { className: "max-w-xs", children: _jsx(FileUpload, { accept: "image/*", label: uploading ? 'Subiendo...' : 'Subir nueva', description: "", onFilesSelected: (files) => void handleUpload(files) }) })] }), uploadError && (_jsx("p", { className: "text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg mb-3", children: uploadError })), _jsx("div", { className: "max-h-[50vh] overflow-y-auto", children: list.isLoading ? (_jsx("div", { className: "grid place-items-center py-10", children: _jsx(Spinner, {}) })) : assets.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500 py-10 text-center", children: "No tienes im\u00E1genes. Sube una con el bot\u00F3n de arriba." })) : (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", children: assets.map((a) => {
                            const selected = selectedIds.includes(a.id);
                            const disabled = !selected && selectedIds.length >= maxSelection;
                            return (_jsxs("button", { type: "button", onClick: () => !disabled && toggle(a.id), className: 'group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border-2 transition-all ' +
                                    (selected
                                        ? 'border-fuchsia-500 ring-2 ring-fuchsia-300'
                                        : disabled
                                            ? 'border-transparent opacity-40 cursor-not-allowed'
                                            : 'border-transparent hover:border-slate-300'), title: a.ai_description ?? '', children: [_jsx("img", { src: a.asset_url, alt: a.ai_description ?? 'asset', className: "w-full h-full object-cover", loading: "lazy" }), _jsx("div", { className: "absolute top-2 left-2", children: _jsx(Checkbox, { checked: selected, tabIndex: -1 }) })] }, a.id));
                        }) })) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }), _jsx(Button, { onClick: handleConfirm, children: "Aceptar" })] })] }) }));
}
