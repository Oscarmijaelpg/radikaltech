import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/providers/ProjectProvider';
import { useChats } from '@/features/chat/api/chat';
import { useReports } from '@/features/reports/api/reports';
import { useCompetitors } from '@/features/memory/api/memory/competitors';
import { useMemories } from '@/features/memory/api/memory/memories';
import { useAssets } from '@/features/content/api/content';
import { cn } from '@/shared/utils/cn';
const Ctx = createContext(null);
export function CommandPaletteProvider({ children }) {
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen((o) => !o), []);
    useEffect(() => {
        function onKey(e) {
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    return (_jsxs(Ctx.Provider, { value: { open, setOpen, toggle }, children: [children, _jsx(CommandPalette, {})] }));
}
export function useCommandPalette() {
    const ctx = useContext(Ctx);
    if (!ctx) {
        return {
            open: false,
            setOpen: () => undefined,
            toggle: () => undefined,
        };
    }
    return ctx;
}
function fuzzyMatch(query, text) {
    const q = query.toLowerCase().trim();
    const t = text.toLowerCase();
    if (!q)
        return 0;
    if (t.includes(q))
        return 100;
    const words = q.split(/\s+/);
    let score = 0;
    for (const w of words) {
        if (w && t.includes(w))
            score += 20;
    }
    return score;
}
const GROUP_LABELS = {
    chat: 'Chats',
    report: 'Reportes',
    competitor: 'Competidores',
    memory: 'Memorias',
    asset: 'Assets',
};
const GROUP_ORDER = [
    'chat',
    'report',
    'competitor',
    'memory',
    'asset',
];
export function CommandPalette() {
    const ctx = useContext(Ctx);
    const open = ctx?.open ?? false;
    const setOpen = ctx?.setOpen ?? (() => undefined);
    const { activeProject } = useProject();
    const projectId = activeProject?.id ?? null;
    const [query, setQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    // Solo consultar cuando palette abierto para no sobrecargar
    const chats = useChats(open ? projectId : null);
    const reports = useReports(open ? projectId : null);
    const competitors = useCompetitors(open ? projectId : null, 'all');
    const memories = useMemories(open ? projectId : null);
    const assets = useAssets(open ? projectId : null, { sort: 'recent' });
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIdx(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);
    const groups = useMemo(() => {
        if (!open)
            return [];
        const q = query.trim();
        const rank = (items) => {
            const scored = q
                ? items.filter((it) => it.score > 0).sort((a, b) => b.score - a.score)
                : items;
            return scored.slice(0, 5);
        };
        const chatResults = (chats.data ?? []).map((c) => {
            const title = c.title ?? 'Chat sin título';
            return {
                id: c.id,
                type: 'chat',
                title,
                subtitle: new Date(c.updatedAt ?? c.createdAt).toLocaleDateString(),
                icon: 'chat',
                url: `/chat/${c.id}`,
                score: fuzzyMatch(q, title),
            };
        });
        const reportResults = (reports.data ?? []).map((r) => ({
            id: r.id,
            type: 'report',
            title: r.title,
            subtitle: r.reportType,
            icon: 'assignment',
            url: `/reports?report=${r.id}`,
            score: fuzzyMatch(q, `${r.title} ${r.summary ?? ''}`),
        }));
        const compResults = (competitors.data ?? []).map((c) => ({
            id: c.id,
            type: 'competitor',
            title: c.name,
            subtitle: c.website ?? undefined,
            icon: 'flag',
            url: `/memory?tab=competitors&competitor=${c.id}`,
            score: fuzzyMatch(q, `${c.name} ${c.website ?? ''}`),
        }));
        const memResults = (memories.data ?? []).map((m) => {
            const title = m.key || m.value.slice(0, 60);
            return {
                id: m.id,
                type: 'memory',
                title,
                subtitle: m.category,
                icon: 'psychology',
                url: `/memory?tab=${encodeURIComponent(m.category)}`,
                score: fuzzyMatch(q, `${m.key} ${m.value} ${m.category}`),
            };
        });
        const assetResults = (assets.data ?? []).slice(0, 20).map((a) => {
            const title = a.ai_description?.slice(0, 80) ?? `Asset ${a.id.slice(0, 6)}`;
            return {
                id: a.id,
                type: 'asset',
                title,
                subtitle: a.asset_type,
                icon: 'image',
                url: `/content`,
                score: fuzzyMatch(q, `${a.ai_description ?? ''} ${(a.tags ?? []).join(' ')}`),
            };
        });
        const out = [
            { type: 'chat', items: rank(chatResults) },
            { type: 'report', items: rank(reportResults) },
            { type: 'competitor', items: rank(compResults) },
            { type: 'memory', items: rank(memResults) },
            { type: 'asset', items: rank(assetResults) },
        ].filter((g) => g.items.length > 0);
        // Max 25 total
        let total = 0;
        const trimmed = [];
        for (const g of out) {
            if (total >= 25)
                break;
            const space = 25 - total;
            const items = g.items.slice(0, space);
            trimmed.push({ type: g.type, items });
            total += items.length;
        }
        // Ordenar según GROUP_ORDER
        trimmed.sort((a, b) => GROUP_ORDER.indexOf(a.type) - GROUP_ORDER.indexOf(b.type));
        return trimmed;
    }, [open, query, chats.data, reports.data, competitors.data, memories.data, assets.data]);
    const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
    useEffect(() => {
        if (selectedIdx >= flat.length)
            setSelectedIdx(0);
    }, [flat.length, selectedIdx]);
    const go = useCallback((r) => {
        setOpen(false);
        navigate(r.url);
    }, [navigate, setOpen]);
    const onKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx((i) => Math.min(i + 1, flat.length - 1));
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx((i) => Math.max(i - 1, 0));
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            const r = flat[selectedIdx];
            if (r)
                go(r);
        }
    }, [flat, selectedIdx, go, setOpen]);
    if (!open)
        return null;
    let runningIdx = -1;
    return (_jsxs("div", { className: "fixed inset-0 z-[100] grid place-items-start justify-center pt-[10vh] px-4", onKeyDown: onKeyDown, children: [_jsx("div", { className: "absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150", onClick: () => setOpen(false), "aria-hidden": true }), _jsxs("div", { role: "dialog", "aria-label": "B\u00FAsqueda global", className: "relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200", children: [_jsxs("div", { className: "flex items-center gap-3 px-5 py-4 border-b border-slate-100", children: [_jsx("span", { className: "material-symbols-outlined text-slate-400", children: "search" }), _jsx("input", { ref: inputRef, value: query, onChange: (e) => {
                                    setQuery(e.target.value);
                                    setSelectedIdx(0);
                                }, placeholder: "Busca chats, reportes, competidores, noticias, memorias...", className: "flex-1 outline-none text-base placeholder:text-slate-400 bg-transparent" }), _jsx("kbd", { className: "hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500", children: "ESC" })] }), _jsxs("div", { className: "max-h-[60vh] overflow-y-auto py-2", children: [flat.length === 0 && (_jsx("div", { className: "px-6 py-12 text-center text-sm text-slate-400", children: query.trim()
                                    ? 'Sin resultados'
                                    : 'Empieza a escribir para buscar en tu espacio...' })), groups.map((g) => (_jsxs("div", { className: "py-1", children: [_jsx("div", { className: "px-5 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400", children: GROUP_LABELS[g.type] }), g.items.map((r) => {
                                        runningIdx += 1;
                                        const isSelected = runningIdx === selectedIdx;
                                        const myIdx = runningIdx;
                                        return (_jsxs("button", { onMouseEnter: () => setSelectedIdx(myIdx), onClick: () => go(r), className: cn('w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors', isSelected
                                                ? 'bg-[hsl(var(--color-primary)/0.08)]'
                                                : 'hover:bg-slate-50'), children: [_jsx("span", { className: cn('material-symbols-outlined text-[20px]', isSelected
                                                        ? 'text-[hsl(var(--color-primary))]'
                                                        : 'text-slate-400'), children: r.icon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-semibold text-slate-900 truncate", children: r.title }), r.subtitle && (_jsx("p", { className: "text-[11px] text-slate-500 truncate", children: r.subtitle }))] }), isSelected && (_jsx("span", { className: "material-symbols-outlined text-[16px] text-slate-400", children: "keyboard_return" }))] }, `${r.type}-${r.id}`));
                                    })] }, g.type)))] }), _jsxs("div", { className: "flex items-center justify-between px-5 py-2 border-t border-slate-100 text-[11px] text-slate-400 bg-slate-50/50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { children: [_jsx("kbd", { className: "font-mono", children: "\u2191\u2193" }), " navegar"] }), _jsxs("span", { children: [_jsx("kbd", { className: "font-mono", children: "\u21B5" }), " abrir"] }), _jsxs("span", { children: [_jsx("kbd", { className: "font-mono", children: "esc" }), " cerrar"] })] }), _jsxs("span", { children: [flat.length, " resultado", flat.length === 1 ? '' : 's'] })] })] })] }));
}
