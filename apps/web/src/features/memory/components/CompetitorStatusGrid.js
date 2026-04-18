import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Badge, Button, Card, Spinner } from '@radikal/ui';
import { useCompetitors, useSocialAccounts, useAnalyzeCompetitor, } from '../api/memory';
import { UserSocialAccountModal } from './UserSocialAccountModal';
const NETWORKS = [
    { key: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { key: 'tiktok', label: 'TikTok', icon: 'music_note' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'work' },
    { key: 'facebook', label: 'Facebook', icon: 'thumb_up' },
    { key: 'youtube', label: 'YouTube', icon: 'play_circle' },
    { key: 'x', label: 'X', icon: 'alternate_email' },
];
function formatRelativeHours(iso) {
    if (!iso)
        return null;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t))
        return null;
    const diffH = Math.round((Date.now() - t) / 3_600_000);
    if (diffH < 1)
        return 'hace < 1h';
    if (diffH < 48)
        return `hace ${diffH}h`;
    const d = Math.round(diffH / 24);
    return `hace ${d}d`;
}
export function CompetitorStatusGrid({ projectId }) {
    const { data: competitors, isLoading: loadingC } = useCompetitors(projectId);
    const { data: accounts, isLoading: loadingA } = useSocialAccounts(projectId);
    const analyze = useAnalyzeCompetitor();
    const [analyzingId, setAnalyzingId] = useState(null);
    const [userModalOpen, setUserModalOpen] = useState(false);
    if (loadingC || loadingA) {
        return (_jsx(Card, { className: "p-6 flex items-center justify-center", children: _jsx(Spinner, {}) }));
    }
    const userAccountsByPlatform = {};
    (accounts ?? []).forEach((a) => {
        userAccountsByPlatform[a.platform] = true;
    });
    const handleSyncAll = async (c) => {
        setAnalyzingId(c.id);
        try {
            await analyze.mutateAsync({ id: c.id, project_id: projectId, mode: 'social' });
        }
        finally {
            setAnalyzingId(null);
        }
    };
    return (_jsxs(Card, { className: "p-0 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-bold text-slate-900", children: "Estado de Monitorizaci\u00F3n" }), _jsx("p", { className: "text-[10px] uppercase tracking-widest text-slate-400 font-semibold", children: "Matriz de redes sincronizadas" })] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => setUserModalOpen(true), children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "add_link" }), "Mis redes"] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left border-b border-slate-100 bg-white", children: [_jsx("th", { className: "px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400", children: "Cuenta" }), NETWORKS.map((n) => (_jsx("th", { className: "px-2 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center", children: n.label }, n.key))), _jsx("th", { className: "px-4 py-3" })] }) }), _jsxs("tbody", { children: [_jsxs("tr", { className: "border-b border-slate-50 bg-[hsl(var(--color-primary)/0.02)]", children: [_jsx("td", { className: "px-4 py-3 font-bold text-slate-900", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-[18px] text-[hsl(var(--color-primary))]", children: "stars" }), "Mi marca"] }) }), NETWORKS.map((n) => {
                                            const active = userAccountsByPlatform[n.key];
                                            return (_jsx("td", { className: "px-2 py-3 text-center", children: _jsxs("button", { onClick: () => setUserModalOpen(true), className: `inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${active
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-slate-50 text-slate-400 border border-dashed border-slate-200 hover:bg-slate-100'}`, title: active ? 'Conectada' : 'Añadir URL', children: [_jsx("span", { className: "material-symbols-outlined text-[14px]", children: n.icon }), active ? 'OK' : '+'] }) }, n.key));
                                        }), _jsx("td", { className: "px-4 py-3" })] }), (competitors ?? []).map((c) => {
                                    const links = (c.social_links ?? {});
                                    const sync = (c.sync_status ?? {});
                                    return (_jsxs("tr", { className: "border-b border-slate-50 last:border-b-0", children: [_jsx("td", { className: "px-4 py-3 font-semibold text-slate-800", children: c.name }), NETWORKS.map((n) => {
                                                const hasUrl = !!links[n.key];
                                                const s = sync[n.key];
                                                const rel = formatRelativeHours(s?.synced_at);
                                                let badge;
                                                if (s && rel) {
                                                    badge = (_jsx(Badge, { variant: "success", className: "whitespace-nowrap", children: rel }));
                                                }
                                                else if (hasUrl) {
                                                    badge = (_jsx("span", { className: "px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold", children: "Solo URL" }));
                                                }
                                                else {
                                                    badge = (_jsx("span", { className: "px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-dashed border-slate-200 text-[10px] font-bold", children: "\u2014" }));
                                                }
                                                return (_jsx("td", { className: "px-2 py-3 text-center", children: _jsxs("div", { className: "inline-flex flex-col items-center gap-1", children: [_jsx("span", { className: "material-symbols-outlined text-[14px] text-slate-400", children: n.icon }), badge] }) }, n.key));
                                            }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs(Button, { size: "sm", variant: "outline", onClick: () => handleSyncAll(c), disabled: analyzingId === c.id, children: [analyzingId === c.id ? _jsx(Spinner, {}) : (_jsx("span", { className: "material-symbols-outlined text-[14px]", children: "sync" })), "Sincronizar"] }) })] }, c.id));
                                })] })] }) }), _jsx(UserSocialAccountModal, { open: userModalOpen, onOpenChange: setUserModalOpen, projectId: projectId })] }));
}
