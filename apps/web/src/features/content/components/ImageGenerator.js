import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Textarea, Spinner, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch, OptionCard, } from '@radikal/ui';
import { api } from '@/lib/api';
import { useProject } from '@/providers/ProjectProvider';
import { ReferencePicker } from './ReferencePicker';
import { useAssets } from '../api/content';
import { useBrand } from '@/features/memory/api/memory';
import { ImageEditDialog } from './ImageEditDialog';
import { Dialog, DialogContent, DialogTitle } from '@radikal/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';
function useGenerateImage() {
    return useMutation({
        mutationFn: async (vars) => {
            const res = await api.post('/ai-services/generate-image', vars);
            return res.data;
        },
    });
}
function useImageAssets(projectId) {
    return useQuery({
        queryKey: ['content-assets', 'image', projectId],
        enabled: !!projectId,
        queryFn: async () => {
            const res = await api.get(`/content?project_id=${projectId}&type=image&sort=recent&limit=24`);
            return res.data;
        },
    });
}
const MAX_REFS = 6;
const PRESETS = [
    {
        id: 'ig-post',
        label: 'Instagram · Post',
        icon: 'photo_camera',
        size: '1024x1024',
        prefix: 'Foto cuadrada 1:1 profesional para post de Instagram, composición centrada y balanceada, iluminación natural impactante, alta definición, espacio para texto overlay. ',
    },
    {
        id: 'ig-story',
        label: 'Instagram · Story',
        icon: 'auto_stories',
        size: '1024x1792',
        prefix: 'Formato vertical 9:16 para Instagram Story, composición vertical, texto llamativo en zona superior, diseño dinámico y atractivo para mobile. ',
    },
    {
        id: 'ig-reel',
        label: 'Instagram · Reel cover',
        icon: 'movie',
        size: '1024x1792',
        prefix: 'Portada vertical 9:16 para Reel de Instagram, muy llamativa, con elementos visuales de impacto y tipografía grande centrada. ',
    },
    {
        id: 'tt-cover',
        label: 'TikTok · Cover',
        icon: 'music_video',
        size: '1024x1792',
        prefix: 'Portada vertical 9:16 para TikTok, energética, con efectos visuales dinámicos, colores saturados. ',
    },
    {
        id: 'li-post',
        label: 'LinkedIn · Post',
        icon: 'business',
        size: '1792x1024',
        prefix: 'Imagen horizontal 16:9 profesional para LinkedIn, estilo corporativo pero moderno, iluminación limpia, composición ejecutiva. ',
    },
    {
        id: 'li-banner',
        label: 'LinkedIn · Banner',
        icon: 'image',
        size: '1792x1024',
        prefix: 'Banner horizontal corporativo ultra-ancho para LinkedIn, diseño limpio, espacios respirables, profesional. ',
    },
    {
        id: 'fb-cover',
        label: 'Facebook · Cover',
        icon: 'groups',
        size: '1792x1024',
        prefix: 'Cover de página Facebook 16:9, composición horizontal, marca destacada, tipografía grande. ',
    },
    {
        id: 'x-post',
        label: 'X/Twitter · Post',
        icon: 'alternate_email',
        size: '1792x1024',
        prefix: 'Imagen horizontal para post en X/Twitter, composición que funcione bien en timeline, impactante y legible en pequeño. ',
    },
    {
        id: 'carousel',
        label: 'Carrusel slide',
        icon: 'view_carousel',
        size: '1024x1024',
        prefix: 'Slide de carrusel cuadrado 1:1 con diseño informativo, espacio claro para texto grande, tipografía legible. ',
    },
    {
        id: 'product-shot',
        label: 'Producto neutro',
        icon: 'package_2',
        size: '1024x1024',
        prefix: 'Fotografía de producto profesional sobre fondo neutro claro, iluminación de estudio, sombras suaves, centrado. ',
    },
];
function palettetoArray(palette) {
    if (!palette)
        return [];
    if (Array.isArray(palette))
        return palette.filter((x) => typeof x === 'string');
    if (typeof palette === 'object') {
        return Object.values(palette).filter((x) => typeof x === 'string');
    }
    return [];
}
export function ImageGenerator() {
    const { activeProject } = useProject();
    const { toast } = useToast();
    const qc = useQueryClient();
    const [prompt, setPrompt] = useState('');
    const [size, setSize] = useState('1024x1024');
    const [style, setStyle] = useState('vivid');
    const [current, setCurrent] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [references, setReferences] = useState([]);
    const [activePreset, setActivePreset] = useState(null);
    const [variationsCount, setVariationsCount] = useState(1);
    const [selectedVariantIdx, setSelectedVariantIdx] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [abOpen, setAbOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [abPair, setAbPair] = useState({ a: 0, b: 1 });
    // Brand integration
    const imageAssets = useAssets(activeProject?.id, { type: 'image' });
    const logo = useMemo(() => imageAssets.data?.find((a) => a.tags?.includes('logo')), [imageAssets.data]);
    const { data: brand } = useBrand(activeProject?.id);
    const palette = useMemo(() => palettetoArray(brand?.color_palette), [brand?.color_palette]);
    const [useLogo, setUseLogo] = useState(false);
    const [useBrandPalette, setUseBrandPalette] = useState(true);
    // Default logo toggle to ON when we discover a logo.
    useEffect(() => {
        if (logo)
            setUseLogo(true);
    }, [logo?.id]);
    // Default palette toggle based on palette presence.
    useEffect(() => {
        setUseBrandPalette(palette.length > 0);
    }, [palette.length]);
    const generate = useGenerateImage();
    const history = useImageAssets(activeProject?.id);
    const onGenerate = async () => {
        const p = prompt.trim();
        if (p.length < 3)
            return;
        // Merge logo into references (if toggled on and logo exists).
        const refIds = references.map((r) => r.id);
        if (useLogo && logo && !refIds.includes(logo.id)) {
            refIds.push(logo.id);
        }
        try {
            const res = await generate.mutateAsync({
                prompt: p,
                size,
                style,
                project_id: activeProject?.id,
                reference_asset_ids: refIds.length ? refIds : undefined,
                use_brand_palette: useBrandPalette,
                variations: variationsCount,
            });
            setCurrent(res);
            setSelectedVariantIdx(null);
            setAbPair({ a: 0, b: Math.min(1, (res.variations?.length ?? 1) - 1) });
            if (activeProject?.id) {
                qc.invalidateQueries({ queryKey: ['content-assets', 'image', activeProject.id] });
            }
        }
        catch (err) {
            toast({ title: 'Error al generar imagen', description: err instanceof Error ? err.message : 'Intenta de nuevo', variant: 'error' });
        }
    };
    const onRegenerate = () => void onGenerate();
    const onDownload = () => {
        if (!current)
            return;
        const a = document.createElement('a');
        a.href = current.url;
        a.download = `radikal-${current.jobId}.png`;
        a.target = '_blank';
        a.rel = 'noreferrer noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast({ title: 'Descargando imagen...', variant: 'success' });
    };
    const onSaveToGallery = async () => {
        if (!current || !activeProject?.id)
            return;
        if (current.assetId) {
            toast({ title: 'Ya está en tu galería', variant: 'success' });
            return;
        }
        setSaving(true);
        try {
            await api.post('/content', {
                project_id: activeProject.id,
                asset_url: current.url,
                asset_type: 'image',
                metadata: { source: current.model, prompt: current.prompt, size: current.size, style: current.style },
            });
            qc.invalidateQueries({ queryKey: ['content-assets', 'image', activeProject.id] });
            toast({ title: 'Guardado en galería', variant: 'success' });
        }
        catch {
            toast({ title: 'Error al guardar en galería', variant: 'error' });
        }
        finally {
            setSaving(false);
        }
    };
    const removeReference = (id) => {
        setReferences((prev) => prev.filter((r) => r.id !== id));
    };
    const applyPreset = (preset) => {
        setSize(preset.size);
        setPrompt((prev) => {
            // Avoid duplicate prefix if the preset prefix is already at start
            if (prev.startsWith(preset.prefix))
                return prev;
            return preset.prefix + prev;
        });
        setActivePreset(preset.id);
    };
    const loading = generate.isPending;
    const assets = history.data ?? [];
    const hasRefs = references.length > 0;
    const hasLogo = !!logo;
    const hasPalette = palette.length > 0;
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs(Card, { className: "p-6 relative", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-white", children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: "auto_awesome" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-display text-lg font-bold", children: "Generar imagen con IA" }), _jsx("p", { className: "text-xs text-slate-500", children: "Nexo usa Gemini 2.5 Flash Image cuando hay referencias, con DALL-E 3 como fallback." })] })] }), _jsxs("div", { className: "mb-5 p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-cyan-50 border border-white/60 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "material-symbols-outlined text-[18px] text-[hsl(var(--color-primary))]", children: "workspace_premium" }), _jsx("h4", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-slate-700", children: "Integraci\u00F3n con tu marca" })] }), _jsxs("div", { className: "flex items-center justify-between gap-3 p-3 rounded-xl bg-white/70", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [hasLogo ? (_jsx("div", { className: "w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-white shadow-sm", children: _jsx("img", { src: logo.asset_url, alt: "logo", className: "w-full h-full object-cover" }) })) : (_jsx("div", { className: "w-10 h-10 rounded-lg bg-slate-100 grid place-items-center shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[18px] text-slate-400", children: "image" }) })), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-bold text-slate-800", children: "Usar mi logo como referencia" }), _jsx("p", { className: "text-[11px] text-slate-500 leading-tight", children: hasLogo
                                                            ? 'Gemini 2.5 Flash Image preservará tu logo tal cual'
                                                            : 'Sube tu logo en Memoria → Marca para activarlo' })] })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("span", { children: _jsx(Switch, { checked: useLogo && hasLogo, onCheckedChange: setUseLogo, disabled: !hasLogo }) }) }), _jsx(TooltipContent, { side: "left", className: "max-w-[240px]", children: "Gemini 2.5 preservar\u00E1 tu logo exactamente como es" })] })] }), _jsxs("div", { className: "flex items-center justify-between gap-3 p-3 rounded-xl bg-white/70", children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [hasPalette ? (_jsx("div", { className: "flex items-center gap-1 shrink-0", children: palette.slice(0, 5).map((c, i) => (_jsx("span", { className: "w-6 h-6 rounded-md border border-white shadow-sm", style: { backgroundColor: c }, title: c }, i))) })) : (_jsx("div", { className: "w-10 h-10 rounded-lg bg-slate-100 grid place-items-center shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[18px] text-slate-400", children: "palette" }) })), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-bold text-slate-800", children: "Respetar paleta de marca" }), _jsx("p", { className: "text-[11px] text-slate-500 leading-tight", children: hasPalette
                                                            ? 'La IA se ceñirá a los colores de tu marca'
                                                            : 'Genera tu identidad en Memoria → Marca' })] })] }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("span", { children: _jsx(Switch, { checked: useBrandPalette && hasPalette, onCheckedChange: setUseBrandPalette, disabled: !hasPalette }) }) }), _jsx(TooltipContent, { side: "left", className: "max-w-[240px]", children: "Los colores generados coincidir\u00E1n con tu paleta oficial" })] })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2", children: "Plantillas por red" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3", children: PRESETS.map((p) => {
                                    const active = activePreset === p.id;
                                    return (_jsx(OptionCard, { selected: active, onClick: () => applyPreset(p), icon: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: p.icon }), title: _jsx("span", { className: "text-sm", children: p.label }), className: "p-4" }, p.id));
                                }) })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("label", { className: "block text-[10px] font-black uppercase tracking-tighter opacity-60", children: "Referencias (opcional)" }), _jsxs("span", { className: "text-[10px] text-slate-500", children: [references.length, " / ", MAX_REFS] })] }), _jsxs("div", { className: "flex gap-2 flex-wrap items-center", children: [_jsxs(Button, { type: "button", variant: "outline", onClick: () => setPickerOpen(true), disabled: !activeProject, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add_photo_alternate" }), "Elegir de mi galer\u00EDa"] }), !activeProject && (_jsx("span", { className: "text-xs text-slate-500", children: "Necesitas un proyecto activo" }))] })] }), _jsx(Textarea, { value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "Describe la imagen que quieres crear... Ej. Un zorro cyberpunk bebiendo caf\u00E9 en una cafeter\u00EDa de Tokio al atardecer, estilo ilustraci\u00F3n editorial, colores ne\u00F3n.", rows: 4, className: "mb-4" }), hasRefs && (_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2", children: "Usando como referencia" }), _jsx("div", { className: "flex flex-wrap gap-2", children: references.map((r) => (_jsxs("div", { className: "relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 group", children: [_jsx("img", { src: r.asset_url, alt: r.ai_description ?? 'ref', className: "w-full h-full object-cover" }), _jsx("button", { type: "button", onClick: () => removeReference(r.id), className: "absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center hover:bg-black/80", "aria-label": "Quitar referencia", children: _jsx("span", { className: "material-symbols-outlined text-[14px]", children: "close" }) })] }, r.id))) })] })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60", children: "Tama\u00F1o" }), _jsxs(Select, { value: size, onValueChange: (v) => setSize(v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "1024x1024", children: "Cuadrado (1024x1024)" }), _jsx(SelectItem, { value: "1792x1024", children: "Horizontal (1792x1024)" }), _jsx(SelectItem, { value: "1024x1792", children: "Vertical (1024x1792)" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60", children: "Estilo" }), _jsxs(Select, { value: style, onValueChange: (v) => setStyle(v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "vivid", children: "V\u00EDvido (cinem\u00E1tico)" }), _jsx(SelectItem, { value: "natural", children: "Natural (realista)" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60", children: "Variantes" }), _jsxs(Select, { value: String(variationsCount), onValueChange: (v) => setVariationsCount(Number(v)), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "1", children: "1 (r\u00E1pido)" }), _jsx(SelectItem, { value: "2", children: "2" }), _jsx(SelectItem, { value: "3", children: "3" }), _jsx(SelectItem, { value: "4", children: "4" })] })] })] })] }), _jsxs("div", { className: "flex gap-3 flex-wrap items-center", children: [_jsxs(Button, { onClick: () => void onGenerate(), disabled: prompt.trim().length < 3 || loading, className: "h-12 px-6", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "auto_awesome" }), "Generar"] }), !activeProject && (_jsx("p", { className: "text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg", children: "Selecciona un proyecto para guardar las im\u00E1genes." })), generate.isError && (_jsx("p", { className: "text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg", children: "Error generando. Intenta de nuevo." }))] }), loading && (_jsx("div", { className: "absolute inset-0 z-20 rounded-[32px] bg-white/80 backdrop-blur-sm grid place-items-center", children: _jsxs("div", { className: "flex flex-col items-center gap-3 text-center px-6", children: [_jsx(Spinner, { size: "lg" }), _jsx("p", { className: "font-display font-semibold text-slate-700", children: variationsCount > 1
                                        ? `Generando ${variationsCount} variantes...`
                                        : hasRefs || (useLogo && hasLogo)
                                            ? 'Nexo está generando con tu logo y referencias...'
                                            : 'Nexo está creando tu imagen...' }), _jsx("p", { className: "text-xs text-slate-500", children: variationsCount > 1 ? `~${15 * variationsCount} segundos` : '~15 segundos' })] }) }))] }), current && !loading && current.variations && current.variations.length > 1 && (_jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4 flex-wrap gap-2", children: [_jsxs("h3", { className: "font-display text-lg font-bold", children: [current.variations.length, " variantes"] }), _jsxs("div", { className: "flex gap-2 flex-wrap items-center", children: [_jsx(Badge, { variant: "muted", children: current.size }), _jsx(Badge, { variant: "muted", children: current.style }), current.variations.length >= 2 && (_jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                            setAbPair({ a: 0, b: 1 });
                                            setAbOpen(true);
                                        }, children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "compare" }), "Comparar A vs B"] }))] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: current.variations.map((v, i) => {
                            const isSelected = selectedVariantIdx === i;
                            return (_jsxs("div", { className: `rounded-2xl overflow-hidden bg-slate-100 border-2 ${isSelected ? 'border-fuchsia-500' : 'border-transparent'} relative group`, children: [_jsx("img", { src: v.url, alt: v.variant_label, className: "w-full h-auto object-contain max-h-[380px]" }), _jsxs("div", { className: "p-3 bg-white", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap mb-2", children: [_jsx(Badge, { children: v.variant_label }), typeof v.quality_score === 'number' && (_jsxs(Badge, { variant: "muted", children: ["score ", v.quality_score, "/10"] })), isSelected && _jsx(Badge, { variant: "success", children: "Favorita" })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { size: "sm", onClick: async () => {
                                                            setSelectedVariantIdx(i);
                                                            if (v.assetId && activeProject?.id) {
                                                                try {
                                                                    await api.patch(`/content/${v.assetId}`, {
                                                                        tags: ['generated', 'ai', 'selected'],
                                                                    });
                                                                    qc.invalidateQueries({
                                                                        queryKey: ['content-assets', 'image', activeProject.id],
                                                                    });
                                                                }
                                                                catch {
                                                                    toast({ title: 'Error al marcar favorita', variant: 'error' });
                                                                }
                                                            }
                                                        }, children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "favorite" }), "Elegir esta"] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => {
                                                            if (v.assetId) {
                                                                setEditTarget({ assetId: v.assetId, url: v.url });
                                                            }
                                                        }, disabled: !v.assetId, children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "tune" }), "Iterar"] }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                            const a = document.createElement('a');
                                                            a.href = v.url;
                                                            a.download = `radikal-${current.jobId}-v${i + 1}.png`;
                                                            a.target = '_blank';
                                                            a.rel = 'noreferrer noopener';
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            a.remove();
                                                        }, children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "download" }) })] })] })] }, i));
                        }) }), _jsxs("p", { className: "text-sm text-slate-600 mt-4 italic", children: ["\u201C", current.prompt, "\u201D"] })] })), current && !loading && (!current.variations || current.variations.length <= 1) && (_jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4 flex-wrap gap-2", children: [_jsx("h3", { className: "font-display text-lg font-bold", children: "Tu imagen" }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsx(Badge, { children: current.model === 'gemini-2.5-flash-image'
                                            ? 'Generado con Gemini 2.5'
                                            : 'Generado con DALL-E 3' }), _jsx(Badge, { variant: "muted", children: current.size }), _jsx(Badge, { variant: "muted", children: current.style }), current.variations?.[0]?.quality_score !== undefined && (_jsxs(Badge, { variant: "muted", children: ["score ", current.variations[0].quality_score, "/10"] }))] })] }), _jsx("div", { className: "rounded-2xl overflow-hidden bg-slate-100 mb-4", children: _jsx("img", { src: current.url, alt: current.prompt, className: "w-full h-auto object-contain max-h-[600px]" }) }), _jsxs("p", { className: "text-sm text-slate-600 mb-4 italic", children: ["\u201C", current.prompt, "\u201D"] }), _jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [_jsxs(Button, { variant: "outline", onClick: onDownload, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "download" }), "Descargar"] }), _jsxs(Button, { variant: "outline", onClick: onRegenerate, disabled: loading, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "refresh" }), "Regenerar"] }), current.assetId && (_jsxs(Button, { variant: "outline", onClick: () => setEditTarget({ assetId: current.assetId, url: current.url }), children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "tune" }), "Iterar"] })), _jsx(Button, { onClick: () => void onSaveToGallery(), disabled: !activeProject || saving, children: saving ? (_jsxs(_Fragment, { children: [_jsx(Spinner, { size: "sm" }), "Guardando..."] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "bookmark_add" }), "Guardar en galer\u00EDa"] })) })] })] })), _jsxs(Card, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "font-display text-lg font-bold", children: "Historial de im\u00E1genes" }), _jsx(Badge, { variant: "muted", children: assets.length })] }), !activeProject ? (_jsx("p", { className: "text-sm text-slate-500", children: "Selecciona un proyecto para ver tu historial." })) : history.isLoading ? (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "aspect-square rounded-2xl bg-slate-100 animate-pulse" }, i))) })) : assets.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500", children: "A\u00FAn no has generado im\u00E1genes en este proyecto." })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", children: assets.map((a) => (_jsx("a", { href: a.asset_url, target: "_blank", rel: "noreferrer noopener", className: "group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 block", title: a.ai_description ?? '', children: _jsx("img", { src: a.asset_url, alt: a.ai_description ?? 'asset', className: "w-full h-full object-cover group-hover:scale-105 transition-transform", loading: "lazy" }) }, a.id))) }))] }), _jsx(ReferencePicker, { open: pickerOpen, onOpenChange: setPickerOpen, projectId: activeProject?.id, initialSelectedIds: references.map((r) => r.id), maxSelection: MAX_REFS, onConfirm: (picked) => setReferences(picked) }), editTarget && (_jsx(ImageEditDialog, { open: !!editTarget, onOpenChange: (o) => !o && setEditTarget(null), sourceUrl: editTarget.url, sourceAssetId: editTarget.assetId, projectId: activeProject?.id, onUseNew: () => {
                    if (activeProject?.id) {
                        qc.invalidateQueries({ queryKey: ['content-assets', 'image', activeProject.id] });
                        qc.invalidateQueries({ queryKey: ['content', 'list', activeProject.id] });
                    }
                } })), current?.variations && current.variations.length >= 2 && (_jsx(Dialog, { open: abOpen, onOpenChange: setAbOpen, children: _jsxs(DialogContent, { className: "sm:max-w-5xl sm:max-h-[90vh] overflow-auto", children: [_jsx(DialogTitle, { children: "Comparar A vs B" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4", children: ['a', 'b'].map((key) => {
                                const idx = abPair[key];
                                const v = current.variations[idx];
                                if (!v)
                                    return _jsx("div", {}, key);
                                return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs(Badge, { children: [key.toUpperCase(), " \u00B7 ", v.variant_label] }), typeof v.quality_score === 'number' && (_jsxs(Badge, { variant: "muted", children: ["score ", v.quality_score, "/10"] }))] }), _jsx("div", { className: "rounded-2xl overflow-hidden bg-slate-100", children: _jsx("img", { src: v.url, alt: v.variant_label, className: "w-full h-auto object-contain" }) }), _jsxs(Button, { onClick: async () => {
                                                if (v.assetId) {
                                                    try {
                                                        await api.patch(`/content/${v.assetId}`, {
                                                            tags: ['generated', 'ai', 'selected', `ab_winner:${key}`],
                                                        });
                                                        if (activeProject?.id) {
                                                            qc.invalidateQueries({
                                                                queryKey: ['content-assets', 'image', activeProject.id],
                                                            });
                                                        }
                                                    }
                                                    catch {
                                                        toast({ title: 'Error al guardar preferencia', variant: 'error' });
                                                    }
                                                }
                                                setSelectedVariantIdx(idx);
                                                setAbOpen(false);
                                            }, children: ["Preferir ", key.toUpperCase()] })] }, key));
                            }) }), current.variations.length > 2 && (_jsxs("div", { className: "mt-4 flex gap-2 flex-wrap", children: [_jsx("p", { className: "text-xs text-slate-500 w-full", children: "Elegir variantes a comparar:" }), current.variations.map((_, i) => (_jsxs(Button, { size: "sm", variant: abPair.a === i || abPair.b === i ? 'primary' : 'outline', onClick: () => {
                                        setAbPair((p) => {
                                            if (p.a === i)
                                                return p;
                                            if (p.b === i)
                                                return p;
                                            return { a: p.b, b: i };
                                        });
                                    }, children: ["V", i + 1] }, i)))] }))] }) }))] }));
}
