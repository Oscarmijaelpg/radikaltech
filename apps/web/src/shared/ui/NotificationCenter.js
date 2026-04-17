import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@radikal/ui';
import { api } from '@/lib/api';
import { cn } from '@/shared/utils/cn';
function useNotifications() {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const r = await api.get('/notifications?limit=20');
            return r.data;
        },
        refetchInterval: 60_000,
    });
}
function useMarkRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            await api.patch(`/notifications/${id}/read`, {});
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    });
}
function useMarkAllRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await api.post('/notifications/mark-all-read', {});
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    });
}
const KIND_ICONS = {
    analysis_complete: { icon: 'analytics', color: 'from-cyan-500 to-blue-600' },
    recommendation: { icon: 'tips_and_updates', color: 'from-pink-500 to-violet-600' },
    report_ready: { icon: 'description', color: 'from-violet-500 to-purple-600' },
    competitor_update: { icon: 'groups', color: 'from-rose-500 to-pink-600' },
    trend_alert: { icon: 'trending_up', color: 'from-emerald-500 to-teal-600' },
    content_evaluated: { icon: 'palette', color: 'from-amber-500 to-orange-600' },
    default: { icon: 'notifications', color: 'from-slate-400 to-slate-600' },
};
function getKindMeta(kind) {
    return KIND_ICONS[kind] ?? KIND_ICONS.default;
}
function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)
        return 'ahora';
    if (mins < 60)
        return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)
        return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
}
export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const q = useNotifications();
    const markRead = useMarkRead();
    const markAllRead = useMarkAllRead();
    const [pendingReadId, setPendingReadId] = useState(null);
    const unread = q.data?.unread_count ?? 0;
    const items = q.data?.items ?? [];
    const handleClick = useCallback((n) => {
        if (!n.isRead) {
            setPendingReadId(n.id);
            markRead.mutate(n.id, {
                onSettled: () => setPendingReadId(null),
            });
        }
        if (n.actionUrl)
            window.location.href = n.actionUrl;
        setOpen(false);
    }, [markRead, setOpen]);
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), className: "relative p-2 rounded-xl hover:bg-slate-100 transition-colors", "aria-label": "Notificaciones", children: [_jsx("span", { className: "material-symbols-outlined text-[22px] text-slate-600", children: "notifications" }), unread > 0 && (_jsx("span", { className: "absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black grid place-items-center shadow-sm", children: unread > 9 ? '9+' : unread }))] }), open && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-40", onClick: () => setOpen(false) }), _jsxs("div", { className: "fixed inset-x-0 top-14 mx-2 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mx-0 mt-2 w-auto sm:w-[360px] max-h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50", children: [_jsxs("div", { className: "px-4 py-3 border-b border-slate-100 flex items-center justify-between", children: [_jsx("h3", { className: "font-display font-bold text-sm text-slate-900", children: "Notificaciones" }), unread > 0 && (_jsx("button", { type: "button", onClick: () => markAllRead.mutate(), disabled: markAllRead.isPending, className: "text-[11px] font-semibold text-[hsl(var(--color-primary))] hover:underline disabled:opacity-50 disabled:cursor-not-allowed", children: markAllRead.isPending ? 'Marcando...' : 'Marcar todo como leído' }))] }), _jsx("div", { className: "overflow-y-auto max-h-[400px]", children: q.isLoading ? (_jsx("div", { className: "py-8 grid place-items-center", children: _jsx(Spinner, { size: "sm" }) })) : items.length === 0 ? (_jsxs("div", { className: "py-10 text-center", children: [_jsx("span", { className: "material-symbols-outlined text-[32px] text-slate-300", children: "notifications_off" }), _jsx("p", { className: "text-xs text-slate-400 mt-2", children: "Sin notificaciones" })] })) : (_jsx("ul", { children: items.map((n) => {
                                        const meta = getKindMeta(n.kind);
                                        return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => handleClick(n), className: cn('w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-all border-b border-slate-50', !n.isRead && 'bg-blue-50/40', pendingReadId === n.id && 'opacity-50'), children: [_jsx("div", { className: cn('w-8 h-8 rounded-lg bg-gradient-to-br grid place-items-center text-white shrink-0 mt-0.5', meta.color), children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: meta.icon }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: cn('text-xs font-semibold truncate', n.isRead ? 'text-slate-700' : 'text-slate-900'), children: n.title }), !n.isRead && _jsx("span", { className: "w-2 h-2 rounded-full bg-blue-500 shrink-0" })] }), n.body && (_jsx("p", { className: "text-[11px] text-slate-500 line-clamp-2 mt-0.5", children: n.body })), _jsx("p", { className: "text-[10px] text-slate-400 mt-1", children: relativeTime(n.createdAt) })] })] }) }, n.id));
                                    }) })) })] })] }))] }));
}
