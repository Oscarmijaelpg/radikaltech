import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, EmptyState, Input, Spinner, Textarea, Checkbox, Badge, Tooltip, TooltipContent, TooltipTrigger, } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import { useAssets } from '../api/content';
import { CaptionGeneratorDialog } from './CaptionGeneratorDialog';
import { ScheduledCalendar } from './ScheduledCalendar';
import { useScheduledPosts, useCreateScheduledPost, useCancelScheduledPost, useDeleteScheduledPost, useUpdateScheduledPost, } from '../api/scheduler';
const PLATFORMS = [
    { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { id: 'tiktok', label: 'TikTok', icon: 'music_video' },
    { id: 'linkedin', label: 'LinkedIn', icon: 'business' },
    { id: 'facebook', label: 'Facebook', icon: 'groups' },
    { id: 'x', label: 'X / Twitter', icon: 'alternate_email' },
    { id: 'threads', label: 'Threads', icon: 'forum' },
    { id: 'pinterest', label: 'Pinterest', icon: 'push_pin' },
    { id: 'youtube', label: 'YouTube', icon: 'smart_display' },
    { id: 'other', label: 'Otra', icon: 'public' },
];
const platformIcon = (p) => PLATFORMS.find((x) => x.id === p)?.icon ?? 'public';
const platformLabel = (p) => PLATFORMS.find((x) => x.id === p)?.label ?? p;
function formatDay(d) {
    return d.toLocaleDateString('es', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}
function formatTime(d) {
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
function dayKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toDatetimeLocalValue(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function minScheduledValue() {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    return toDatetimeLocalValue(d);
}
function PostCard({ post, asset, onCancel, onEdit, cancelling }) {
    const date = new Date(post.scheduled_at);
    const isCancelled = post.status === 'cancelled';
    return (_jsxs(Card, { className: "p-4 flex flex-col sm:flex-row gap-4", children: [_jsx("div", { className: "w-full sm:w-24 h-40 sm:h-24 rounded-xl bg-slate-100 shrink-0 overflow-hidden grid place-items-center", children: asset ? (_jsx("img", { src: asset.asset_url, alt: "", className: "w-full h-full object-cover" })) : (_jsx("span", { className: "material-symbols-outlined text-[28px] text-slate-400", children: "image" })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap mb-2", children: [post.platforms.map((p) => (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-700", children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: platformIcon(p) }), platformLabel(p)] }, p))), _jsx(Badge, { variant: isCancelled ? 'muted' : 'primary', children: isCancelled ? 'Cancelado' : formatTime(date) })] }), post.caption && (_jsx("p", { className: "text-sm text-slate-700 mb-2", style: {
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }, children: post.caption })), post.hashtags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 mb-2", children: post.hashtags.slice(0, 8).map((h) => (_jsxs("span", { className: "text-[11px] text-[hsl(var(--color-primary))] font-medium", children: ["#", h] }, h))) })), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsxs(Button, { size: "sm", variant: "outline", onClick: onEdit, disabled: isCancelled, className: "min-h-[44px] sm:min-h-0", children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "edit" }), "Editar"] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: onCancel, disabled: isCancelled || cancelling, className: "min-h-[44px] sm:min-h-0", children: [cancelling ? _jsx(Spinner, { size: "sm" }) : _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "cancel" }), "Cancelar"] })] })] })] }));
}
const initialDialogState = {
    open: false,
    editingId: null,
    assetId: null,
    caption: '',
    hashtags: [],
    hashtagDraft: '',
    platforms: [],
    scheduledAt: minScheduledValue(),
    notes: '',
};
export function ScheduledPostsTab() {
    const { activeProject } = useProject();
    const { toast } = useToast();
    const projectId = activeProject?.id;
    const query = useScheduledPosts(projectId);
    const imageAssets = useAssets(projectId, { type: 'image' });
    const createMut = useCreateScheduledPost();
    const updateMut = useUpdateScheduledPost();
    const cancelMut = useCancelScheduledPost();
    const deleteMut = useDeleteScheduledPost();
    const [dialog, setDialog] = useState(initialDialogState);
    const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const assetsById = useMemo(() => {
        const map = new Map();
        (imageAssets.data ?? []).forEach((a) => map.set(a.id, a));
        return map;
    }, [imageAssets.data]);
    const preferredAssets = useMemo(() => {
        const list = imageAssets.data ?? [];
        const preferred = list.filter((a) => a.tags?.includes('generated'));
        const rest = list.filter((a) => !a.tags?.includes('generated'));
        return [...preferred, ...rest];
    }, [imageAssets.data]);
    const grouped = useMemo(() => {
        const items = (query.data ?? [])
            .filter((p) => p.status !== 'cancelled' || true)
            .slice()
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        const map = new Map();
        for (const p of items) {
            const k = dayKey(new Date(p.scheduled_at));
            if (!map.has(k))
                map.set(k, []);
            map.get(k).push(p);
        }
        return Array.from(map.entries());
    }, [query.data]);
    const openCreate = (prefillDate) => {
        let scheduledAt = minScheduledValue();
        if (prefillDate) {
            const d = new Date(prefillDate);
            // Default 10:00 local, but if the day is today and 10:00 is past, use min future
            d.setHours(10, 0, 0, 0);
            if (d.getTime() <= Date.now() + 10 * 60 * 1000) {
                const min = new Date(Date.now() + 15 * 60 * 1000);
                d.setFullYear(prefillDate.getFullYear(), prefillDate.getMonth(), prefillDate.getDate());
                if (d.getTime() <= Date.now() + 10 * 60 * 1000) {
                    d.setTime(min.getTime());
                }
            }
            scheduledAt = toDatetimeLocalValue(d);
        }
        setDialog({ ...initialDialogState, open: true, scheduledAt });
    };
    const openEdit = (post) => {
        setDialog({
            open: true,
            editingId: post.id,
            assetId: post.asset_id,
            caption: post.caption ?? '',
            hashtags: post.hashtags,
            hashtagDraft: '',
            platforms: post.platforms,
            scheduledAt: toDatetimeLocalValue(new Date(post.scheduled_at)),
            notes: post.notes ?? '',
        });
    };
    const addHashtag = () => {
        const v = dialog.hashtagDraft.trim().replace(/^#/, '');
        if (!v || dialog.hashtags.includes(v)) {
            setDialog((d) => ({ ...d, hashtagDraft: '' }));
            return;
        }
        setDialog((d) => ({ ...d, hashtags: [...d.hashtags, v], hashtagDraft: '' }));
    };
    const removeHashtag = (h) => setDialog((d) => ({ ...d, hashtags: d.hashtags.filter((x) => x !== h) }));
    const togglePlatform = (p) => setDialog((d) => ({
        ...d,
        platforms: d.platforms.includes(p)
            ? d.platforms.filter((x) => x !== p)
            : [...d.platforms, p],
    }));
    const canSubmit = !!projectId &&
        dialog.platforms.length > 0 &&
        dialog.scheduledAt.length > 0 &&
        new Date(dialog.scheduledAt).getTime() > Date.now();
    const onSubmit = async () => {
        if (!projectId || !canSubmit)
            return;
        const scheduledIso = new Date(dialog.scheduledAt).toISOString();
        try {
            if (dialog.editingId) {
                await updateMut.mutateAsync({
                    id: dialog.editingId,
                    project_id: projectId,
                    asset_id: dialog.assetId,
                    platforms: dialog.platforms,
                    caption: dialog.caption || null,
                    hashtags: dialog.hashtags,
                    scheduled_at: scheduledIso,
                    notes: dialog.notes || null,
                });
                toast({ title: 'Post actualizado', variant: 'success' });
            }
            else {
                await createMut.mutateAsync({
                    project_id: projectId,
                    asset_id: dialog.assetId,
                    platforms: dialog.platforms,
                    caption: dialog.caption || null,
                    hashtags: dialog.hashtags,
                    scheduled_at: scheduledIso,
                    notes: dialog.notes || null,
                });
                toast({ title: 'Post agendado', variant: 'success' });
            }
            setDialog(initialDialogState);
        }
        catch {
            toast({ title: 'No se pudo guardar', variant: 'error' });
        }
    };
    const onCancelPost = (post) => {
        if (!projectId)
            return;
        cancelMut.mutate({ id: post.id, project_id: projectId });
    };
    if (!activeProject) {
        return (_jsx(Card, { className: "p-6", children: _jsx("p", { className: "text-sm text-slate-500", children: "Selecciona un proyecto para ver tus posts agendados." }) }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "rounded-2xl bg-cyan-50 border border-cyan-100 px-4 py-3 text-sm text-cyan-900 flex items-start gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[18px] mt-0.5", children: "info" }), _jsx("p", { children: "Los posts se guardan en Radikal como recordatorio. La publicaci\u00F3n autom\u00E1tica en redes requiere integraci\u00F3n con OAuth (pr\u00F3ximamente)." })] }), _jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-display text-lg font-bold", children: "Pr\u00F3ximos posts" }), _jsxs("p", { className: "text-xs text-slate-500", children: [(query.data ?? []).length, " agendados en este proyecto"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "inline-flex rounded-xl border border-slate-200 overflow-hidden", children: [_jsxs("button", { type: "button", onClick: () => setViewMode('list'), className: viewMode === 'list'
                                            ? 'px-3 py-1.5 text-xs font-semibold bg-[hsl(var(--color-primary))] text-white flex items-center gap-1'
                                            : 'px-3 py-1.5 text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 flex items-center gap-1', children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "view_list" }), "Lista"] }), _jsxs("button", { type: "button", onClick: () => setViewMode('calendar'), className: viewMode === 'calendar'
                                            ? 'px-3 py-1.5 text-xs font-semibold bg-[hsl(var(--color-primary))] text-white flex items-center gap-1'
                                            : 'px-3 py-1.5 text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 flex items-center gap-1', children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "calendar_month" }), "Calendario"] })] }), _jsxs(Button, { onClick: () => openCreate(), children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), "Nuevo post"] })] })] }), query.isLoading ? (_jsx("div", { className: "py-10 grid place-items-center", children: _jsx(Spinner, {}) })) : viewMode === 'calendar' ? (_jsx(ScheduledCalendar, { posts: query.data ?? [], assetsById: assetsById, onCreateAtDate: (d) => openCreate(d), onEditPost: (p) => openEdit(p) })) : grouped.length === 0 ? (_jsx(EmptyState, { icon: _jsx("span", { className: "material-symbols-outlined text-[28px]", children: "event_upcoming" }), title: "Sin posts agendados", description: "Crea tu primer post agendado para planificar tu contenido.", action: _jsxs(Button, { onClick: () => openCreate(), children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), "Agendar post"] }) })) : (grouped.map(([k, posts]) => {
                const first = posts[0];
                if (!first)
                    return null;
                const date = new Date(first.scheduled_at);
                return (_jsxs("section", { className: "space-y-3", children: [_jsx("h4", { className: "text-[10px] font-black uppercase tracking-tighter opacity-60", children: formatDay(date) }), _jsx("div", { className: "space-y-3", children: posts.map((p) => (_jsx(PostCard, { post: p, asset: p.asset_id ? assetsById.get(p.asset_id) : undefined, onCancel: () => onCancelPost(p), onEdit: () => openEdit(p), cancelling: cancelMut.isPending && cancelMut.variables?.id === p.id }, p.id))) })] }, k));
            })), _jsx(Dialog, { open: dialog.open, onOpenChange: (v) => setDialog((d) => ({ ...d, open: v })), children: _jsxs(DialogContent, { className: "sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: dialog.editingId ? 'Editar post agendado' : 'Nuevo post agendado' }) }), _jsxs("div", { className: "space-y-5 py-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold mb-2", children: "Asset (opcional)" }), preferredAssets.length === 0 ? (_jsx("p", { className: "text-xs text-slate-500", children: "No hay im\u00E1genes disponibles. Sube o genera im\u00E1genes primero." })) : (_jsxs("div", { className: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto", children: [_jsx("button", { type: "button", onClick: () => setDialog((d) => ({ ...d, assetId: null })), className: dialog.assetId === null
                                                        ? 'aspect-square rounded-xl border-2 border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)] grid place-items-center'
                                                        : 'aspect-square rounded-xl border-2 border-slate-200 bg-slate-50 grid place-items-center hover:border-slate-300', children: _jsx("span", { className: "material-symbols-outlined text-[20px] text-slate-400", children: "block" }) }), preferredAssets.map((a) => (_jsx("button", { type: "button", onClick: () => setDialog((d) => ({ ...d, assetId: a.id })), className: dialog.assetId === a.id
                                                        ? 'aspect-square rounded-xl overflow-hidden border-2 border-[hsl(var(--color-primary))] ring-2 ring-[hsl(var(--color-primary)/0.3)]'
                                                        : 'aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-slate-300', children: _jsx("img", { src: a.asset_url, alt: "", className: "w-full h-full object-cover" }) }, a.id)))] }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("p", { className: "text-sm font-semibold", children: "Caption" }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: () => setCaptionDialogOpen(true), children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "auto_awesome" }), "Generar caption con IA"] }) }), _jsx(TooltipContent, { side: "top", className: "max-w-[240px]", children: "Genera 3 variantes por plataforma en tu tono de marca" })] })] }), _jsx(Textarea, { rows: 4, value: dialog.caption, onChange: (e) => setDialog((d) => ({ ...d, caption: e.target.value })), placeholder: "Texto del post..." })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold mb-2", children: "Hashtags" }), _jsx("div", { className: "flex flex-wrap gap-2 mb-2", children: dialog.hashtags.map((h) => (_jsxs("span", { className: "inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-xs font-semibold", children: ["#", h, _jsx("button", { type: "button", onClick: () => removeHashtag(h), "aria-label": `Quitar ${h}`, children: _jsx("span", { className: "material-symbols-outlined text-[14px]", children: "close" }) })] }, h))) }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { value: dialog.hashtagDraft, onChange: (e) => setDialog((d) => ({ ...d, hashtagDraft: e.target.value })), onKeyDown: (e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addHashtag();
                                                        }
                                                    }, placeholder: "A\u00F1adir hashtag (Enter)", containerClassName: "flex-1" }), _jsx(Button, { type: "button", variant: "outline", onClick: addHashtag, children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }) })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold mb-2", children: "Plataformas" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2", children: PLATFORMS.map((p) => {
                                                const checked = dialog.platforms.includes(p.id);
                                                return (_jsxs("label", { className: checked
                                                        ? 'flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)] cursor-pointer'
                                                        : 'flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-slate-300', children: [_jsx(Checkbox, { checked: checked, onCheckedChange: () => togglePlatform(p.id) }), _jsx("span", { className: "material-symbols-outlined text-[18px]", children: p.icon }), _jsx("span", { className: "text-sm font-semibold", children: p.label })] }, p.id));
                                            }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold mb-2", children: "Fecha y hora" }), _jsx("input", { type: "datetime-local", min: minScheduledValue(), value: dialog.scheduledAt, onChange: (e) => setDialog((d) => ({ ...d, scheduledAt: e.target.value })), className: "w-full h-11 rounded-xl border border-slate-200 px-3 text-sm" }), _jsx("p", { className: "text-[11px] text-slate-500 mt-1", children: "M\u00EDnimo 10 minutos en el futuro." })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold mb-2", children: "Notas (opcional)" }), _jsx(Textarea, { rows: 2, value: dialog.notes, onChange: (e) => setDialog((d) => ({ ...d, notes: e.target.value })), placeholder: "Referencias internas, briefs..." })] })] }), _jsxs(DialogFooter, { children: [dialog.editingId && (_jsxs(Button, { variant: "outline", onClick: () => {
                                        if (!projectId || !dialog.editingId)
                                            return;
                                        deleteMut.mutate({ id: dialog.editingId, project_id: projectId });
                                        setDialog(initialDialogState);
                                    }, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "delete" }), "Eliminar"] })), _jsx(Button, { variant: "outline", onClick: () => setDialog(initialDialogState), children: "Cancelar" }), _jsx(Button, { onClick: () => void onSubmit(), disabled: !canSubmit || createMut.isPending || updateMut.isPending, children: createMut.isPending || updateMut.isPending ? (_jsxs(_Fragment, { children: [_jsx(Spinner, { size: "sm" }), " Guardando..."] })) : dialog.editingId ? 'Guardar cambios' : 'Agendar' })] })] }) }), _jsx(CaptionGeneratorDialog, { open: captionDialogOpen, onOpenChange: setCaptionDialogOpen, defaultPlatform: dialog.platforms[0] ?? 'instagram', assetId: dialog.assetId, onUseCaption: (caption, hashtags) => setDialog((d) => ({
                    ...d,
                    caption,
                    hashtags: Array.from(new Set([...d.hashtags, ...hashtags])),
                })) })] }));
}
