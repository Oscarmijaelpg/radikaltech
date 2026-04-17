import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { Card, Button, Badge, Skeleton, Dialog, DialogContent, DialogTitle, DialogDescription, Spinner, } from '@radikal/ui';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useProject } from '@/providers/ProjectProvider';
import { useAssets, useDeleteAsset, useEvaluateAsset, } from '../api/content';
import { ImageEditDialog } from './ImageEditDialog';
function scoreBadgeVariant(score) {
    if (score === null || score === undefined)
        return 'muted';
    if (score < 5)
        return 'destructive';
    if (score < 7)
        return 'warning';
    return 'success';
}
function formatDate(iso) {
    try {
        return new Date(iso).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }
    catch {
        return iso;
    }
}
function AssetThumb({ asset }) {
    if (asset.asset_type === 'image') {
        return (_jsx("img", { src: asset.asset_url, alt: "", className: "w-full aspect-square object-cover", loading: "lazy" }));
    }
    const icon = asset.asset_type === 'video'
        ? 'movie'
        : asset.asset_type === 'audio'
            ? 'music_note'
            : 'description';
    return (_jsx("div", { className: "w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center", children: _jsx("span", { className: "material-symbols-outlined text-[48px] text-slate-500", children: icon }) }));
}
export function AssetGallery() {
    const { activeProject } = useProject();
    const [filters, setFilters] = useState({ sort: 'recent' });
    const [selected, setSelected] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const { data: assets, isLoading } = useAssets(activeProject?.id, filters);
    const deleteAsset = useDeleteAsset();
    const evaluateAsset = useEvaluateAsset();
    if (!activeProject) {
        return (_jsx(Card, { className: "p-8 text-center text-sm text-slate-500", children: "Selecciona un proyecto para ver sus assets." }));
    }
    if (isLoading) {
        return (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4", children: Array.from({ length: 8 }).map((_, i) => (_jsx(Skeleton, { className: "aspect-square rounded-3xl" }, i))) }));
    }
    if (!assets || assets.length === 0) {
        return (_jsx(CharacterEmpty, { character: "nexo", title: "\u00BFUna imagen? \u00BFUn video?", message: "\u00A1Vamos, ens\u00E9\u00F1ame qu\u00E9 tienes! Sube el primer asset y lo analizo en el acto." }));
    }
    const onEvaluate = (asset) => {
        void evaluateAsset.mutate({ id: asset.id, project_id: asset.project_id });
    };
    const confirmDialog = useConfirm();
    const onDelete = async (asset) => {
        const ok = await confirmDialog({ title: '¿Eliminar este asset?', variant: 'danger', confirmLabel: 'Eliminar' });
        if (!ok)
            return;
        void deleteAsset.mutate({ id: asset.id, project_id: asset.project_id });
    };
    const suggestions = Array.isArray(selected?.metadata?.suggestions)
        ? (selected.metadata.suggestions)
        : [];
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(Button, { variant: !filters.type ? 'primary' : 'outline', size: "sm", onClick: () => setFilters((f) => ({ ...f, type: undefined })), children: "Todos" }), ['image', 'video', 'document', 'audio'].map((t) => (_jsx(Button, { variant: filters.type === t ? 'primary' : 'outline', size: "sm", onClick: () => setFilters((f) => ({ ...f, type: t })), children: t === 'image'
                                    ? 'Imágenes'
                                    : t === 'video'
                                        ? 'Videos'
                                        : t === 'audio'
                                            ? 'Audio'
                                            : 'Documentos' }, t)))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: filters.sort === 'recent' ? 'primary' : 'outline', size: "sm", onClick: () => setFilters((f) => ({ ...f, sort: 'recent' })), children: "Recientes" }), _jsx(Button, { variant: filters.sort === 'score' ? 'primary' : 'outline', size: "sm", onClick: () => setFilters((f) => ({ ...f, sort: 'score' })), children: "Mejor score" })] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4", children: assets.map((asset) => (_jsxs(Card, { className: "overflow-hidden p-0 group cursor-pointer hover:shadow-xl transition-shadow", onClick: () => setSelected(asset), children: [_jsxs("div", { className: "relative", children: [_jsx(AssetThumb, { asset: asset }), asset.aesthetic_score !== null && (_jsx("div", { className: "absolute top-2 left-2", children: _jsx(Badge, { variant: scoreBadgeVariant(asset.aesthetic_score), children: asset.aesthetic_score.toFixed(1) }) })), _jsx("div", { className: "absolute top-2 right-2", children: _jsx(Badge, { variant: "outline", className: "bg-white/80 backdrop-blur", children: asset.asset_type }) }), _jsxs("div", { className: "absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex gap-2", onClick: (e) => e.stopPropagation(), children: [_jsx(Button, { size: "sm", variant: "outline", className: "bg-white !text-slate-900 border-white flex-1", onClick: () => setSelected(asset), children: "Ver" }), asset.asset_type === 'image' && (_jsx(Button, { size: "sm", onClick: () => onEvaluate(asset), disabled: evaluateAsset.isPending, children: evaluateAsset.isPending && evaluateAsset.variables?.id === asset.id ? (_jsx(Spinner, { size: "sm" })) : ('IA') })), asset.asset_type === 'image' && (_jsx(Button, { size: "sm", variant: "outline", className: "bg-white", onClick: () => setEditTarget(asset), "aria-label": "Iterar imagen", title: "Iterar con IA", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", "aria-hidden": true, children: "tune" }) })), _jsx(Button, { size: "sm", variant: "destructive", onClick: () => onDelete(asset), disabled: deleteAsset.isPending && deleteAsset.variables?.id === asset.id, "aria-label": "Eliminar asset", children: deleteAsset.isPending && deleteAsset.variables?.id === asset.id ? (_jsx(Spinner, { size: "sm" })) : (_jsx("span", { className: "material-symbols-outlined text-[16px]", "aria-hidden": true, children: "delete" })) })] })] }), _jsx("div", { className: "p-3", children: _jsxs("div", { className: "flex flex-wrap gap-1", children: [asset.tags.slice(0, 3).map((t) => (_jsx(Badge, { variant: "muted", children: t }, t))), asset.tags.length > 3 && (_jsxs(Badge, { variant: "muted", children: ["+", asset.tags.length - 3] }))] }) })] }, asset.id))) }), _jsx(Dialog, { open: !!selected, onOpenChange: (open) => !open && setSelected(null), children: _jsx(DialogContent, { className: "sm:max-w-3xl sm:max-h-[90vh] overflow-auto", children: selected && (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(DialogTitle, { children: "Detalle del asset" }), _jsxs(DialogDescription, { children: ["Subido el ", formatDate(selected.created_at)] }), selected.asset_type === 'image' ? (_jsx("img", { src: selected.asset_url, alt: "", className: "w-full max-h-[420px] object-contain rounded-2xl bg-slate-50" })) : (_jsx("a", { href: selected.asset_url, target: "_blank", rel: "noreferrer", className: "underline text-sm", children: "Abrir archivo" })), _jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [selected.aesthetic_score !== null && (_jsxs(Badge, { variant: scoreBadgeVariant(selected.aesthetic_score), children: ["Score: ", selected.aesthetic_score.toFixed(1), " / 10"] })), _jsx(Badge, { variant: "outline", children: selected.asset_type })] }), selected.marketing_feedback && (_jsxs("section", { children: [_jsx("h4", { className: "font-display text-lg font-bold mb-2", children: "Feedback de marketing" }), _jsx("p", { className: "text-sm text-slate-700 whitespace-pre-line leading-relaxed", children: selected.marketing_feedback })] })), selected.tags.length > 0 && (_jsxs("section", { children: [_jsx("h4", { className: "font-display text-lg font-bold mb-2", children: "Tags" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: selected.tags.map((t) => (_jsx(Badge, { variant: "muted", children: t }, t))) })] })), suggestions.length > 0 && (_jsxs("section", { children: [_jsx("h4", { className: "font-display text-lg font-bold mb-2", children: "Sugerencias" }), _jsx("ul", { className: "flex flex-col gap-2", children: suggestions.map((s, i) => (_jsxs("li", { className: "flex gap-2 text-sm", children: [_jsx("span", { className: "material-symbols-outlined text-amber-600 text-[18px]", children: "check_circle" }), _jsx("span", { children: s })] }, i))) })] })), _jsxs("div", { className: "flex gap-2 justify-end flex-wrap", children: [selected.asset_type === 'image' && (_jsx(Button, { variant: "outline", onClick: () => onEvaluate(selected), disabled: evaluateAsset.isPending, children: evaluateAsset.isPending && evaluateAsset.variables?.id === selected.id ? (_jsxs(_Fragment, { children: [_jsx(Spinner, { size: "sm" }), " Evaluando..."] })) : 'Re-evaluar con IA' })), _jsxs(Button, { variant: "destructive", onClick: () => {
                                            onDelete(selected);
                                            setSelected(null);
                                        }, disabled: deleteAsset.isPending, children: [deleteAsset.isPending ? _jsx(Spinner, { size: "sm" }) : null, "Eliminar"] })] })] })) }) }), editTarget && (_jsx(ImageEditDialog, { open: !!editTarget, onOpenChange: (o) => !o && setEditTarget(null), sourceUrl: editTarget.asset_url, sourceAssetId: editTarget.id, projectId: editTarget.project_id }))] }));
}
