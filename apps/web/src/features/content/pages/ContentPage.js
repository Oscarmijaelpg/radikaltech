import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radikal/ui';
import { AssetGallery } from '../components/AssetGallery';
import { AssetUploader } from '../components/AssetUploader';
import { ImageGenerator } from '../components/ImageGenerator';
import { ScheduledPostsTab } from '../components/ScheduledPostsTab';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
export function ContentPage() {
    const [searchParams] = useSearchParams();
    const initial = searchParams.get('tab') || 'gallery';
    const [tab, setTab] = useState(['gallery', 'upload', 'generate', 'scheduled'].includes(initial) ? initial : 'gallery');
    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && ['gallery', 'upload', 'generate', 'scheduled'].includes(t))
            setTab(t);
    }, [searchParams]);
    const TAB_SUB = {
        gallery: 'Galería',
        upload: 'Subir archivos',
        generate: 'Generar con IA',
        scheduled: 'Agendados',
    };
    return (_jsxs("div", { className: "min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950", children: [_jsxs("div", { className: "px-4 sm:px-6 md:px-8 pt-3 pb-1 max-w-7xl mx-auto flex items-center justify-between gap-3 text-[11px] text-slate-500", children: [_jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [_jsx("span", { className: "material-symbols-outlined text-[14px] text-[hsl(var(--color-primary))]", children: "palette" }), _jsx("span", { className: "font-semibold truncate", children: "Crear" }), _jsx("span", { className: "opacity-40", children: "\u203A" }), _jsxs("span", { className: "truncate", children: ["Contenido \u00B7 ", TAB_SUB[tab]] })] }), _jsx("kbd", { className: "hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0", children: "\u2318K Buscar" })] }), _jsxs("div", { className: "p-4 sm:p-6 md:p-8 pt-2 max-w-7xl mx-auto", children: [_jsx(FeatureHint, { id: "content-first-v1", title: "Sube im\u00E1genes existentes o genera nuevas con IA", description: "Aqu\u00ED vive tu banco visual. Analizamos cada asset y generamos contenido fiel a tu marca.", children: _jsxs("header", { className: "mb-8 md:mb-10 relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-amber-500 to-orange-600 p-6 md:p-10 text-white shadow-2xl", children: [_jsx("div", { className: "absolute top-4 right-4 z-20", children: _jsx(HelpButton, { title: "Contenido", description: "Sube tus im\u00E1genes existentes o genera nuevas con IA. Despu\u00E9s puedes agendarlas en el calendario editorial.", tips: [
                                            'Usa Galería para ver y organizar todo tu contenido visual.',
                                            'Generar con IA respeta tu logo y paleta de marca si lo activas.',
                                            'Agenda posts multiplataforma desde la pestaña Agendados.',
                                        ] }) }), _jsx("div", { className: "absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" }), _jsx("div", { className: "relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6", children: _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest opacity-80 mb-2", children: "Biblioteca visual" }), _jsx("h1", { className: "text-3xl md:text-5xl font-display font-black tracking-tight", children: "Contenido" }), _jsx("p", { className: "text-white/80 mt-3 text-base md:text-lg", children: "Sube, eval\u00FAa y organiza los archivos de tu marca con IA." })] }) })] }) }), _jsxs(Tabs, { value: tab, onValueChange: (v) => setTab(v), className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "gallery", children: "Galer\u00EDa" }), _jsx(TabsTrigger, { value: "upload", children: "Subir" }), _jsx(TabsTrigger, { value: "generate", children: "Generar con IA" }), _jsx(TabsTrigger, { value: "scheduled", children: "Agendados" })] }), _jsx(TabsContent, { value: "gallery", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(AssetGallery, {}) }), _jsx(TabsContent, { value: "upload", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(AssetUploader, {}) }), _jsx(TabsContent, { value: "generate", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(ImageGenerator, {}) }), _jsx(TabsContent, { value: "scheduled", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(ScheduledPostsTab, {}) })] })] })] }));
}
