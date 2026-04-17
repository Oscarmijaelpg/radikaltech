import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { NewProjectDialog } from '../components/NewProjectDialog';
function getInitials(name) {
    if (!name)
        return '??';
    return name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}
function ProjectCard({ project, onSelect, isActive }) {
    const { url: logo, brightness } = useProjectLogoWithBrightness(project.id);
    const label = project.company_name ?? project.name;
    return (_jsxs(Card, { className: `p-6 hover:scale-[1.02] transition-transform cursor-pointer relative ${isActive ? 'ring-2 ring-[hsl(var(--color-primary))] border-[hsl(var(--color-primary))]' : ''}`, onClick: onSelect, children: [logo ? (_jsx("div", { className: "w-14 h-14 rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4 grid place-items-center", style: logoContainerStyle(brightness), children: _jsx("img", { src: logo, alt: label, className: "w-full h-full object-contain p-1" }) })) : (_jsx("div", { className: "w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white font-display font-bold shadow-lg mb-4", children: getInitials(label) })), _jsx("h3", { className: "font-display font-bold text-xl text-slate-900 truncate", children: label }), _jsx("p", { className: "text-[10px] font-black uppercase tracking-tighter opacity-50 mt-2", children: project.industry ?? 'Sin industria' }), isActive && (_jsxs("span", { className: "mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-[10px] font-black uppercase tracking-widest border border-[hsl(var(--color-primary)/0.3)]", children: [_jsx("span", { className: "material-symbols-outlined text-[12px]", children: "check_circle" }), "Activo"] })), project.is_default && !isActive && (_jsxs("span", { className: "mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200", children: [_jsx("span", { className: "material-symbols-outlined text-[12px]", children: "star" }), "Por defecto"] }))] }));
}
export function ProjectsPage() {
    const { projects, setActiveProject, activeProject } = useProject();
    const navigate = useNavigate();
    const [dialogOpen, setDialogOpen] = useState(false);
    const handleSelect = (p) => {
        setActiveProject(p);
        navigate('/');
    };
    return (_jsxs("div", { className: "min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40", children: [_jsxs("div", { className: "p-4 sm:p-6 md:p-8 max-w-7xl mx-auto", children: [_jsxs("header", { className: "mb-6 sm:mb-8 md:mb-10 relative overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-6 md:p-10 text-white shadow-2xl", children: [_jsx("div", { className: "absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" }), _jsxs("div", { className: "relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest opacity-80 mb-2", children: "Tus marcas" }), _jsx("h1", { className: "text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight", children: "Proyectos" }), _jsx("p", { className: "text-white/80 mt-3 text-base md:text-lg", children: "Cada proyecto es un universo de marca independiente." })] }), _jsxs(Button, { variant: "outline", className: "bg-white !text-slate-900 border-white hover:bg-white/90 min-h-[44px]", onClick: () => setDialogOpen(true), children: [_jsx("span", { className: "material-symbols-outlined text-[20px]", children: "add" }), "Nuevo proyecto"] })] })] }), projects.length === 0 ? (_jsx(Card, { className: "p-6 md:p-12", children: _jsx(CharacterEmpty, { character: "ankor", title: "Cada marca empieza aqu\u00ED", message: "Creemos la primera. Un nombre, una industria, y abrimos un nuevo universo de marca donde guardamos toda tu estrategia.", action: { label: 'Nuevo proyecto', onClick: () => setDialogOpen(true) } }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6", children: projects.map((p) => (_jsx(ProjectCard, { project: p, onSelect: () => handleSelect(p), isActive: activeProject?.id === p.id }, p.id))) }))] }), _jsx(NewProjectDialog, { open: dialogOpen, onOpenChange: setDialogOpen })] }));
}
