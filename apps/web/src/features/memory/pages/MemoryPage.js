import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Tabs, TabsContent, TabsList, TabsTrigger } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { BrandTab } from '../components/BrandTab';
import { ProductsTab } from '../components/ProductsTab';
import { CustomersTab } from '../components/CustomersTab';
import { CompetitorsTab } from '../components/CompetitorsTab';
import { SavedChatsTab } from '../components/SavedChatsTab';
import { NeuronasTab } from '../components/NeuronasTab';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
const VALID_TABS = ['brand', 'products', 'customers', 'competitors', 'saved_chats', 'neuronas'];
const TAB_CONTEXT = {
    brand: { section: 'Mi marca', sub: 'Mi identidad' },
    products: { section: 'Mi marca', sub: 'Productos' },
    customers: { section: 'Mi marca', sub: 'Clientes' },
    competitors: { section: 'Mi marca', sub: 'Competencia' },
    saved_chats: { section: 'Mi marca', sub: 'Chats guardados' },
    neuronas: { section: 'Mi marca', sub: 'Biblioteca' },
};
export function MemoryPage() {
    const { activeProject } = useProject();
    const [searchParams] = useSearchParams();
    const initial = searchParams.get('tab');
    const [tab, setTab] = useState(initial && VALID_TABS.includes(initial) ? initial : 'brand');
    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && VALID_TABS.includes(t))
            setTab(t);
    }, [searchParams]);
    const ctx = TAB_CONTEXT[tab];
    return (_jsxs("div", { className: "min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950", children: [_jsxs("div", { className: "px-4 sm:px-6 md:px-8 pt-3 pb-1 max-w-7xl mx-auto flex items-center justify-between gap-3 text-[11px] text-slate-500", children: [_jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [_jsx("span", { className: "material-symbols-outlined text-[14px] text-[hsl(var(--color-primary))]", children: "auto_awesome" }), _jsx("span", { className: "font-semibold truncate", children: ctx.section }), _jsx("span", { className: "opacity-40", children: "\u203A" }), _jsx("span", { className: "truncate", children: ctx.sub })] }), _jsx("kbd", { className: "hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0", children: "\u2318K Buscar" })] }), _jsxs("div", { className: "p-4 sm:p-6 md:p-8 pt-2 max-w-7xl mx-auto", children: [_jsx(FeatureHint, { id: "memory-brand-v1", title: "Aqu\u00ED defines c\u00F3mo eres como marca", description: "Completa tu identidad: esencia, tono de voz y visi\u00F3n. Todo lo que creemos ser\u00E1 coherente.", children: _jsxs("header", { className: "mb-4 sm:mb-6 md:mb-8 relative overflow-hidden rounded-2xl sm:rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-violet-500 to-purple-600 p-4 sm:p-6 md:p-10 text-white shadow-2xl", children: [_jsx("div", { className: "absolute top-4 right-4 z-20", children: _jsx(HelpButton, { title: "Memoria de marca", description: "Aqu\u00ED vive todo sobre tu marca: identidad, productos, clientes, competidores y notas. Cuanto m\u00E1s completes, mejor funciona la IA.", tips: [
                                            'Completa primero Mi identidad para que todos los agentes tengan contexto.',
                                            'Añade competidores para activar análisis comparativos.',
                                            'Usa Chats guardados y Biblioteca como memoria de largo plazo.',
                                        ] }) }), _jsx("div", { className: "absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" }), _jsxs("div", { className: "relative z-10 flex flex-col md:flex-row md:items-center gap-4", children: [_jsx("div", { className: "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[24px] sm:text-[32px]", children: "auto_awesome" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest opacity-80 mb-2", children: "Base de conocimiento" }), _jsx("h1", { className: "text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight", children: "Identidad" }), _jsx("p", { className: "text-white/80 mt-2", children: "Todo lo que la IA sabe sobre tu marca, en un solo lugar." })] })] })] }) }), !activeProject ? (_jsx(Card, { className: "p-12 text-center", children: _jsx("p", { className: "text-sm text-slate-500", children: "Selecciona un proyecto para ver su identidad." }) })) : (_jsxs(Tabs, { value: tab, onValueChange: (v) => setTab(v), className: "w-full", children: [_jsxs(TabsList, { className: "flex overflow-x-auto scrollbar-hide max-w-full flex-nowrap", children: [_jsx(TabsTrigger, { value: "brand", className: "shrink-0", children: "Mi identidad" }), _jsx(TabsTrigger, { value: "products", className: "shrink-0", children: "Productos" }), _jsx(TabsTrigger, { value: "customers", className: "shrink-0", children: "Clientes" }), _jsx(TabsTrigger, { value: "competitors", className: "shrink-0", children: "Competencia" }), _jsx(TabsTrigger, { value: "saved_chats", className: "shrink-0", children: "Chats guardados" }), _jsx(TabsTrigger, { value: "neuronas", className: "shrink-0", children: "Biblioteca" })] }), _jsx(TabsContent, { value: "brand", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(BrandTab, { projectId: activeProject.id }) }), _jsx(TabsContent, { value: "products", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(ProductsTab, { projectId: activeProject.id }) }), _jsx(TabsContent, { value: "customers", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(CustomersTab, { projectId: activeProject.id }) }), _jsx(TabsContent, { value: "competitors", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(CompetitorsTab, { projectId: activeProject.id }) }), _jsx(TabsContent, { value: "saved_chats", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(SavedChatsTab, { projectId: activeProject.id }) }), _jsx(TabsContent, { value: "neuronas", className: "animate-in fade-in slide-in-from-right-2 duration-300", children: _jsx(NeuronasTab, { projectId: activeProject.id }) })] }))] })] }));
}
