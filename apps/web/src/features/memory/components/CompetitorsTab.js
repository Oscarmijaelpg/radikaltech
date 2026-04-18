import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Badge, Button, Card, Skeleton, Spinner, Tooltip, TooltipContent, TooltipTrigger, } from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useAnalyzeCompetitor, useCompetitors, useCreateCompetitor, useDeleteCompetitor, useUpdateCompetitor, useDetectCompetitors, useApproveCompetitor, useRejectCompetitor, useBulkApproveCompetitors, useBulkRejectCompetitors, } from '../api/memory';
import { CompetitorModal } from './CompetitorModal';
import { CompetitorAnalysisDialog } from './CompetitorAnalysisDialog';
import { CompetitorStatusGrid } from './CompetitorStatusGrid';
import { CompetitionCharts } from './CompetitionCharts';
import { UserSocialAccountModal } from './UserSocialAccountModal';
import { CompetitorsBenchmarkTab } from './CompetitorsBenchmarkTab';
export function CompetitorsTab({ projectId }) {
    const confirmDialog = useConfirm();
    const { data: allCompetitors, isLoading } = useCompetitors(projectId, 'all');
    const create = useCreateCompetitor();
    const update = useUpdateCompetitor();
    const remove = useDeleteCompetitor();
    const analyze = useAnalyzeCompetitor();
    const detect = useDetectCompetitors();
    const approve = useApproveCompetitor();
    const reject = useRejectCompetitor();
    const bulkApprove = useBulkApproveCompetitors();
    const bulkReject = useBulkRejectCompetitors();
    const suggested = (allCompetitors ?? []).filter((c) => c.status === 'suggested');
    const competitors = (allCompetitors ?? []).filter((c) => !c.status || c.status === 'confirmed');
    const onDetect = async () => {
        await detect.mutateAsync({ project_id: projectId });
    };
    const onApprove = async (id) => {
        await approve.mutateAsync({ id, project_id: projectId });
    };
    const onReject = async (id) => {
        await reject.mutateAsync({ id, project_id: projectId });
    };
    const onApproveAll = async () => {
        const ids = suggested.map((c) => c.id);
        if (ids.length === 0)
            return;
        await bulkApprove.mutateAsync({ ids, project_id: projectId });
    };
    const onRejectAll = async () => {
        const ids = suggested.map((c) => c.id);
        if (ids.length === 0)
            return;
        await bulkReject.mutateAsync({ ids, project_id: projectId });
    };
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [userSocialOpen, setUserSocialOpen] = useState(false);
    const [subTab, setSubTab] = useState('list');
    const [analyzingId, setAnalyzingId] = useState(null);
    const [analysisOpen, setAnalysisOpen] = useState(false);
    const [analysisName, setAnalysisName] = useState('');
    const [analysisCompetitorId, setAnalysisCompetitorId] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [lastMode, setLastMode] = useState('combined');
    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };
    const openEdit = (c) => {
        setEditing(c);
        setModalOpen(true);
    };
    const onSubmit = async (data) => {
        const socialEntries = Object.entries(data.social_links).filter(([, v]) => v && v.trim());
        const socialLinks = socialEntries.length > 0 ? Object.fromEntries(socialEntries) : null;
        setLastMode(data.analysis_mode);
        if (editing) {
            await update.mutateAsync({
                id: editing.id,
                project_id: projectId,
                name: data.name,
                website: data.website || null,
                notes: data.notes || null,
                social_links: socialLinks,
            });
        }
        else {
            await create.mutateAsync({
                project_id: projectId,
                name: data.name,
                website: data.website || null,
                notes: data.notes || null,
                social_links: socialLinks,
            });
        }
        setModalOpen(false);
    };
    const onDelete = async (c) => {
        const ok = await confirmDialog({ title: `¿Eliminar ${c.name}?`, variant: 'danger', confirmLabel: 'Eliminar' });
        if (!ok)
            return;
        await remove.mutateAsync({ id: c.id, project_id: projectId });
    };
    const onAnalyze = async (c) => {
        setAnalyzingId(c.id);
        setAnalysisName(c.name);
        setAnalysisCompetitorId(c.id);
        try {
            const res = await analyze.mutateAsync({
                id: c.id,
                project_id: projectId,
                mode: lastMode,
            });
            const webResult = res.result && typeof res.result === 'object'
                ? res.result
                : null;
            setAnalysisResult(webResult);
            setAnalysisOpen(true);
        }
        finally {
            setAnalyzingId(null);
        }
    };
    const onViewAnalysis = (c) => {
        if (!c.analysis_data)
            return;
        setAnalysisName(c.name);
        setAnalysisCompetitorId(c.id);
        const raw = c.analysis_data;
        const hasWeb = raw && (raw.competitors || raw.insights || raw.query);
        setAnalysisResult(hasWeb ? c.analysis_data : null);
        setAnalysisOpen(true);
    };
    if (isLoading)
        return _jsx(Skeleton, { className: "h-48" });
    const analyzedIds = (competitors ?? []).filter((c) => c.last_analyzed_at).map((c) => c.id);
    const subTabToggle = (_jsxs("div", { className: "inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1", children: [_jsx("button", { type: "button", onClick: () => setSubTab('list'), className: `px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${subTab === 'list'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'}`, children: "Lista" }), _jsx("button", { type: "button", onClick: () => setSubTab('benchmark'), className: `px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${subTab === 'benchmark'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'}`, children: "Benchmark" })] }));
    if (subTab === 'benchmark') {
        return (_jsxs("div", { className: "space-y-5", children: [_jsx("div", { className: "flex justify-start", children: subTabToggle }), _jsx(CompetitorsBenchmarkTab, { projectId: projectId })] }));
    }
    return (_jsxs("div", { className: "space-y-5 relative", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 sm:gap-2", children: [subTabToggle, _jsxs("div", { className: "flex flex-wrap justify-end gap-2", children: [_jsxs(Button, { variant: "outline", onClick: () => setUserSocialOpen(true), children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "hub" }), "Mis redes sociales"] }), _jsxs(Button, { variant: "outline", onClick: onDetect, disabled: detect.isPending, children: [detect.isPending ? (_jsx(Spinner, {})) : (_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "auto_awesome" })), "Detectar competidores con IA"] }), _jsxs(Button, { onClick: openCreate, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), "A\u00F1adir competidor"] })] })] }), suggested.length > 0 && (_jsxs(Card, { className: "p-5 bg-amber-50 border-amber-200 space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "material-symbols-outlined text-amber-700", children: "auto_awesome" }), _jsxs("p", { className: "text-sm font-semibold text-amber-900", children: ["Sira detect\u00F3 ", suggested.length, " competidores potenciales"] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: onRejectAll, disabled: bulkReject.isPending, children: "Rechazar todos" }), _jsx(Button, { size: "sm", onClick: onApproveAll, disabled: bulkApprove.isPending, children: "Aceptar todos" })] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: suggested.map((c) => (_jsxs(Card, { className: "p-4 bg-white flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h4", { className: "font-semibold text-slate-900 truncate", children: c.name }), c.website && (_jsx("a", { href: c.website, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-[hsl(var(--color-primary))] hover:underline truncate block", children: c.website }))] }), _jsx(Badge, { variant: "outline", children: "Sugerido" })] }), c.notes && (_jsx("p", { className: "text-xs text-slate-600 line-clamp-3", children: c.notes })), _jsxs("div", { className: "mt-auto flex gap-2 pt-1", children: [_jsx(Button, { size: "sm", onClick: () => onApprove(c.id), children: "Aceptar" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => onReject(c.id), children: "Rechazar" })] })] }, c.id))) })] })), detect.isPending && (_jsx("div", { className: "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center", children: _jsxs(Card, { className: "p-8 max-w-sm text-center space-y-4", children: [_jsx("div", { className: "flex justify-center", children: _jsx(Spinner, {}) }), _jsx("p", { className: "text-sm text-slate-700", children: "Sira est\u00E1 investigando tu sector\u2026" })] }) })), competitors && competitors.length > 0 && (_jsx(CompetitorStatusGrid, { projectId: projectId })), !competitors || competitors.length === 0 ? (_jsx(Card, { className: "p-6", children: _jsx(CharacterEmpty, { character: "sira", title: "Dame nombres, yo hago el trabajo", message: "A\u00F1ade a tus competidores y yo investigo, detecto oportunidades y te traigo insights estrat\u00E9gicos.", action: { label: 'Añadir competidor', onClick: openCreate } }) })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4", children: competitors.map((c) => {
                    const analyzed = !!c.last_analyzed_at;
                    return (_jsxs(Card, { className: "p-5 flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "font-display font-bold text-lg text-slate-900 truncate", children: c.name }), c.website && (_jsx("a", { href: c.website, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-[hsl(var(--color-primary))] hover:underline truncate block", children: c.website }))] }), analyzed && _jsx(Badge, { variant: "success", children: "Analizado" })] }), c.notes && (_jsx("p", { className: "text-sm text-slate-600 line-clamp-3", children: c.notes })), _jsxs("div", { className: "mt-auto flex flex-wrap gap-2", children: [_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs(Button, { size: "sm", onClick: () => onAnalyze(c), disabled: analyzingId === c.id, children: [analyzingId === c.id ? _jsx(Spinner, {}) : (_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "auto_awesome" })), "Analizar"] }) }), _jsx(TooltipContent, { side: "top", className: "max-w-[240px]", children: "Investigamos al competidor con IA y encontramos sus fortalezas y debilidades" })] }), analyzed && (_jsx(Button, { size: "sm", variant: "outline", onClick: () => onViewAnalysis(c), children: "Ver an\u00E1lisis" })), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => openEdit(c), "aria-label": "Editar", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "edit" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => onDelete(c), "aria-label": "Eliminar", children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "delete" }) })] })] }, c.id));
                }) })), analyzedIds.length > 0 && (_jsxs("div", { className: "pt-2", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "material-symbols-outlined text-[hsl(var(--color-primary))]", children: "analytics" }), _jsx("h3", { className: "text-sm font-bold text-slate-900", children: "Benchmark de inteligencia social" })] }), _jsx(CompetitionCharts, { projectId: projectId, competitorIds: analyzedIds })] })), analyzingId && (_jsx("div", { className: "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center", children: _jsxs(Card, { className: "p-8 max-w-sm text-center space-y-4", children: [_jsx("div", { className: "flex justify-center", children: _jsx(Spinner, {}) }), _jsxs("p", { className: "text-sm text-slate-700", children: ["Sira est\u00E1 investigando a ", _jsx("strong", { children: analysisName }), "\u2026", _jsx("br", {}), "Esto puede tardar ~30s."] })] }) })), _jsx(CompetitorModal, { open: modalOpen, onOpenChange: setModalOpen, initial: editing, onSubmit: onSubmit, saving: create.isPending || update.isPending }), _jsx(CompetitorAnalysisDialog, { open: analysisOpen, onOpenChange: setAnalysisOpen, projectId: projectId, competitorId: analysisCompetitorId, competitorName: analysisName, result: analysisResult }), _jsx(UserSocialAccountModal, { open: userSocialOpen, onOpenChange: setUserSocialOpen, projectId: projectId })] }));
}
