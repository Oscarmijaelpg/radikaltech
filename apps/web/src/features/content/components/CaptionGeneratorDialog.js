import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Spinner, Card, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import { useGenerateCaption, } from '../api/content';
const LENGTH_LABEL = {
    short: 'Corta',
    medium: 'Media',
    long: 'Larga',
};
export function CaptionGeneratorDialog({ open, onOpenChange, defaultPlatform, assetId, onUseCaption, }) {
    const { activeProject } = useProject();
    const { toast } = useToast();
    const mut = useGenerateCaption();
    const [platform, setPlatform] = useState(defaultPlatform);
    const [topic, setTopic] = useState('');
    const [result, setResult] = useState(null);
    const handleGenerate = async () => {
        try {
            const res = await mut.mutateAsync({
                asset_id: assetId ?? undefined,
                topic: topic || undefined,
                platforms: [platform],
                project_id: activeProject?.id,
            });
            setResult(res);
        }
        catch {
            toast({ title: 'No se pudo generar captions', variant: 'error' });
        }
    };
    const variants = result?.per_platform?.[platform]?.variants ?? [];
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Generar caption con IA" }) }), _jsxs("div", { className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold mb-2", children: "Plataforma" }), _jsxs(Select, { value: platform, onValueChange: (v) => setPlatform(v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "instagram", children: "Instagram" }), _jsx(SelectItem, { value: "tiktok", children: "TikTok" }), _jsx(SelectItem, { value: "linkedin", children: "LinkedIn" }), _jsx(SelectItem, { value: "facebook", children: "Facebook" }), _jsx(SelectItem, { value: "x", children: "X / Twitter" }), _jsx(SelectItem, { value: "threads", children: "Threads" }), _jsx(SelectItem, { value: "pinterest", children: "Pinterest" }), _jsx(SelectItem, { value: "youtube", children: "YouTube" })] })] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold mb-2", children: "Tema / descripci\u00F3n (opcional)" }), _jsx(Input, { value: topic, onChange: (e) => setTopic(e.target.value), placeholder: "Ej: lanzamiento producto, detr\u00E1s de c\u00E1maras..." })] }), _jsxs(Button, { onClick: () => void handleGenerate(), disabled: mut.isPending, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "auto_awesome" }), mut.isPending ? 'Generando...' : mut.isError ? 'Reintentar' : result ? 'Regenerar' : 'Generar 3 variantes'] }), mut.isPending && (_jsxs("div", { className: "py-8 grid place-items-center text-center", children: [_jsx(Spinner, {}), _jsx("p", { className: "text-sm text-slate-600 mt-3", children: "Nexo est\u00E1 escribiendo copies..." })] })), !mut.isPending && variants.length > 0 && (_jsx("div", { className: "space-y-3", children: variants.map((v, i) => (_jsxs(Card, { className: "p-4 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]", children: LENGTH_LABEL[v.length] ?? v.length }), v.emoji_suggested?.length > 0 && (_jsx("span", { className: "text-lg", children: v.emoji_suggested.join(' ') }))] }), _jsx("p", { className: "text-sm text-slate-700 whitespace-pre-wrap", children: v.caption }), v.hashtags?.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1", children: v.hashtags.map((h) => (_jsxs("span", { className: "text-[11px] text-[hsl(var(--color-primary))] font-medium", children: ["#", h] }, h))) })), _jsxs(Button, { size: "sm", onClick: () => {
                                            onUseCaption(v.caption, v.hashtags ?? []);
                                            onOpenChange(false);
                                        }, children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "check" }), "Usar esta"] })] }, i))) }))] }), _jsx(DialogFooter, { children: _jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cerrar" }) })] }) }));
}
