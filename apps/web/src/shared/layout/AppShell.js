import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { cn } from '@/shared/utils/cn';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';
import radikalLogo from '@/media/radikal-logo.png';
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell';
import { JobFailureToasts } from '@/features/notifications/components/JobFailureToasts';
import { LevelBadge } from '@/shared/fte/FirstTimeExperience';
import { GlobalJobsBanner } from './GlobalJobsBanner';
const NAV_SECTIONS = [
    {
        title: null,
        items: [
            { to: '/', label: 'Inicio', icon: 'home', tour: 'nav-dashboard' },
            { to: '/chat', label: 'Chat', icon: 'chat', tour: 'nav-chat' },
            { to: '/memory', label: 'Mi marca', icon: 'auto_awesome', tour: 'nav-memory' },
            { to: '/content', label: 'Contenido', icon: 'palette', tour: 'nav-content' },
            { to: '/news', label: 'Análisis', icon: 'insights', tour: 'nav-reports' },
        ],
    },
];
// Rutas que el item "Análisis" considera propias (marca activo)
const ANALYSIS_ROUTES = ['/news', '/reports', '/recommendations'];
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
function ProjectBadge({ projectId, label, size = 36 }) {
    const { url: logo, brightness } = useProjectLogoWithBrightness(projectId);
    const px = { width: size, height: size };
    if (logo) {
        return (_jsx("div", { style: { ...px, ...logoContainerStyle(brightness) }, className: "rounded-xl border border-slate-200 overflow-hidden shrink-0 grid place-items-center", children: _jsx("img", { src: logo, alt: label ?? 'Logo', className: "w-full h-full object-contain p-0.5" }) }));
    }
    return (_jsx("div", { style: px, className: "rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shrink-0 text-xs font-bold", children: label ? getInitials(label) : _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "workspaces" }) }));
}
function isRouteActive(pathname, _search, target) {
    const targetPath = target.split('?')[0];
    if (targetPath === '/')
        return pathname === '/';
    // "Analisis" (item /news) agrupa /news /reports /recommendations
    if (targetPath === '/news') {
        return ANALYSIS_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
    }
    return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}
function SidebarContent({ onNavigate, compact = false, iconOnly = false }) {
    const { profile, signOut } = useAuth();
    const { activeProject, projects, setActiveProject } = useProject();
    const navigate = useNavigate();
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [projectMenuOpen, setProjectMenuOpen] = useState(false);
    const projectDropdownRef = useRef(null);
    const userDropdownRef = useRef(null);
    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (projectMenuOpen && projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
                setProjectMenuOpen(false);
            }
            if (userMenuOpen && userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [projectMenuOpen, userMenuOpen]);
    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };
    const userInitials = getInitials(profile?.full_name ?? profile?.email ?? '?');
    // Icon-only collapsed sidebar for tablet
    if (iconOnly) {
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "px-3 py-4 border-b border-[hsl(var(--color-border))] flex justify-center", children: _jsx("img", { src: radikalLogo, alt: "Radikal", className: "h-8 w-auto object-contain" }) }), projects.length > 0 && activeProject && (_jsx("div", { className: "px-2 py-3 border-b border-[hsl(var(--color-border))] flex justify-center", children: _jsx(ProjectBadge, { projectId: activeProject.id, label: activeProject.company_name ?? activeProject.name, size: 32 }) })), _jsx("nav", { className: "flex-1 px-2 py-4 overflow-y-auto", children: _jsx("div", { className: "space-y-1", children: NAV_SECTIONS.flatMap((s) => s.items).map((item) => {
                            const active = isRouteActive(location.pathname, location.search, item.to);
                            return (_jsx(NavLink, { to: item.to, end: item.to === '/', title: item.label, "data-tour": item.tour, className: cn('flex items-center justify-center w-11 h-11 rounded-xl text-sm font-semibold transition-all mx-auto', active
                                    ? 'bg-[hsl(var(--color-primary))] text-white shadow-lg shadow-[hsl(var(--color-primary)/0.35)]'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'), children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: item.icon }) }, item.to));
                        }) }) }), _jsx("div", { className: "px-2 py-3 border-t border-[hsl(var(--color-border))] flex justify-center", children: _jsx("button", { onClick: () => {
                            navigate('/settings');
                        }, "aria-label": "Ajustes de usuario", className: "w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white font-bold text-sm shrink-0 overflow-visible", children: _jsx("div", { className: "w-full h-full rounded-xl overflow-hidden grid place-items-center", children: profile?.avatar_url ? (_jsx("img", { src: profile.avatar_url, alt: "", className: "w-full h-full object-cover" })) : (userInitials) }) }) })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "px-6 py-6 border-b border-[hsl(var(--color-border))] flex flex-col items-start", children: [_jsx("img", { src: radikalLogo, alt: "Radikal", className: "h-10 w-auto" }), _jsx("p", { className: "text-[10px] font-black uppercase tracking-tighter opacity-50 mt-2", children: "Inteligencia radical" })] }), projects.length > 0 && (_jsxs("div", { className: "px-4 py-4 border-b border-[hsl(var(--color-border))] relative", ref: projectDropdownRef, children: [_jsx("label", { className: "block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-50", children: "Proyecto activo" }), _jsxs("button", { onClick: () => setProjectMenuOpen(!projectMenuOpen), "aria-label": "Cambiar proyecto activo", "aria-expanded": projectMenuOpen, "data-tour": "project-selector", className: "w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 hover:border-[hsl(var(--color-primary)/0.4)] hover:shadow-md transition-all text-left min-h-[52px]", children: [_jsx(ProjectBadge, { projectId: activeProject?.id, label: activeProject?.company_name ?? activeProject?.name }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-bold text-slate-900 truncate", children: activeProject?.company_name ?? activeProject?.name ?? 'Sin proyecto' }), _jsx("p", { className: "text-[11px] text-slate-500 truncate", children: activeProject?.industry ?? 'Sin industria' })] }), _jsx("span", { className: "material-symbols-outlined text-slate-400 text-[18px]", children: "unfold_more" })] }), projectMenuOpen && (_jsxs("div", { className: "absolute left-4 right-4 top-[calc(100%-4px)] mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-y-auto max-h-[50vh] z-20 animate-in fade-in slide-in-from-top-2 duration-200", children: [projects.map((p) => (_jsxs("button", { onClick: () => {
                                    setActiveProject(p);
                                    setProjectMenuOpen(false);
                                    onNavigate?.();
                                }, className: cn('w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-2 min-h-[48px]', activeProject?.id === p.id && 'bg-[hsl(var(--color-primary)/0.05)]'), children: [_jsx("span", { className: "flex-1 text-sm font-semibold truncate", children: p.company_name ?? p.name }), activeProject?.id === p.id && (_jsx("span", { className: "material-symbols-outlined text-[hsl(var(--color-primary))] text-[18px]", children: "check" }))] }, p.id))), _jsx("div", { className: "border-t border-slate-100", children: _jsxs("button", { onClick: () => {
                                        setProjectMenuOpen(false);
                                        navigate('/projects');
                                        onNavigate?.();
                                    }, className: "w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-semibold text-[hsl(var(--color-primary))] min-h-[48px]", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), "Nuevo proyecto"] }) })] }))] })), _jsx("nav", { className: "flex-1 px-3 py-4 overflow-y-auto", children: NAV_SECTIONS.map((section, sIdx) => (_jsxs("div", { className: sIdx === 0 ? '' : 'mt-4', children: [section.title && (_jsx("p", { className: "px-4 mb-1 text-[10px] font-black uppercase tracking-wider opacity-50", children: section.title })), _jsx("div", { className: "space-y-1", children: section.items.map((item) => {
                                const active = isRouteActive(location.pathname, location.search, item.to);
                                return (_jsxs(NavLink, { to: item.to, end: item.to === '/', onClick: onNavigate, "data-tour": item.tour, className: cn('flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px]', active
                                        ? 'bg-[hsl(var(--color-primary))] text-white shadow-lg shadow-[hsl(var(--color-primary)/0.35)]'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'), children: [_jsx("span", { className: "material-symbols-outlined text-[20px] shrink-0", children: item.icon }), _jsx("span", { className: "flex-1 truncate", children: item.label }), item.badge && (_jsx("span", { className: cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0', active
                                                ? 'bg-white/20 text-white'
                                                : 'bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))]'), children: item.badge }))] }, item.to));
                            }) })] }, sIdx))) }), _jsxs("div", { className: "px-3 py-4 border-t border-[hsl(var(--color-border))] relative", ref: userDropdownRef, children: [_jsxs("button", { onClick: () => setUserMenuOpen(!userMenuOpen), "aria-label": "Abrir menu de usuario", "aria-expanded": userMenuOpen, className: "w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition-colors min-h-[52px]", children: [_jsxs("div", { className: "relative w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white font-bold text-sm shrink-0 overflow-visible", children: [_jsx("div", { className: "w-full h-full rounded-xl overflow-hidden grid place-items-center", children: profile?.avatar_url ? (_jsx("img", { src: profile.avatar_url, alt: "", className: "w-full h-full object-cover" })) : (userInitials) }), _jsx(LevelBadge, {})] }), _jsxs("div", { className: "flex-1 min-w-0 text-left", children: [_jsx("p", { className: "text-sm font-bold text-slate-900 truncate", children: profile?.full_name ?? 'Usuario' }), _jsx("p", { className: "text-[11px] text-slate-500 truncate", children: profile?.email })] }), _jsx("span", { className: "material-symbols-outlined text-slate-400 text-[18px]", children: "more_vert" })] }), userMenuOpen && (_jsxs("div", { className: "absolute left-3 right-3 bottom-[calc(100%-8px)] mb-1 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2 duration-200", children: [_jsxs("button", { onClick: () => {
                                    setUserMenuOpen(false);
                                    navigate('/projects');
                                    onNavigate?.();
                                }, className: "w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 min-h-[48px]", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "folder_special" }), "Mis proyectos"] }), _jsxs("button", { onClick: () => {
                                    setUserMenuOpen(false);
                                    navigate('/settings');
                                    onNavigate?.();
                                }, className: "w-full px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 min-h-[48px]", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "settings" }), "Ajustes"] }), _jsxs("button", { onClick: handleSignOut, className: "w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 min-h-[48px] border-t border-slate-100 dark:border-slate-800", children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "logout" }), "Cerrar sesion"] })] }))] })] }));
}
export function AppShell() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();
    const { activeProject } = useProject();
    // Close drawer on navigation
    useEffect(() => {
        setDrawerOpen(false);
    }, [location.pathname]);
    // Prevent body scroll while drawer is open
    useEffect(() => {
        if (drawerOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [drawerOpen]);
    // Close drawer on Escape key
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape' && drawerOpen) {
                setDrawerOpen(false);
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [drawerOpen]);
    return (_jsxs("div", { className: "min-h-screen lg:h-screen lg:flex bg-gradient-to-br from-pink-50/30 via-white to-cyan-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 lg:overflow-hidden text-slate-900 dark:text-slate-100", children: [_jsx("a", { href: "#main-content", className: "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-lg focus:font-semibold", children: "Saltar al contenido" }), _jsxs("header", { className: cn('lg:hidden sticky top-0 z-30', 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl', 'border-b border-[hsl(var(--color-border))]', 'flex items-center gap-3 px-4 h-14', 
                // Safe-area for notched phones (status bar)
                'pt-[env(safe-area-inset-top)]'), style: { height: `calc(3.5rem + env(safe-area-inset-top, 0px))` }, children: [_jsx("button", { onClick: () => setDrawerOpen(true), "aria-label": "Abrir menu", className: "w-11 h-11 -ml-2 grid place-items-center rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors", children: _jsx("span", { className: "material-symbols-outlined", children: "menu" }) }), _jsx("img", { src: radikalLogo, alt: "Radikal", className: "h-7 w-auto" }), _jsx("div", { className: "flex-1" }), _jsx(NotificationsBell, {}), activeProject && (_jsx(ProjectBadge, { projectId: activeProject.id, label: activeProject.company_name ?? activeProject.name, size: 32 }))] }), _jsx("aside", { className: "hidden lg:flex w-72 shrink-0 border-r border-[hsl(var(--color-border))] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex-col h-screen sticky top-0", children: _jsx(SidebarContent, {}) }), _jsxs("div", { className: cn('lg:hidden fixed inset-0 z-50 transition-visibility', drawerOpen ? 'visible' : 'invisible pointer-events-none'), role: "dialog", "aria-modal": "true", "aria-label": "Menu de navegacion", children: [_jsx("div", { className: cn('absolute inset-0 bg-black/50 transition-opacity duration-300', drawerOpen ? 'opacity-100' : 'opacity-0'), onClick: () => setDrawerOpen(false), "aria-hidden": true }), _jsxs("aside", { className: cn('absolute left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white dark:bg-slate-900 flex flex-col shadow-2xl', 'transition-transform duration-300 ease-out', drawerOpen ? 'translate-x-0' : '-translate-x-full', 
                        // Safe-area insets for notched phones
                        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]'), children: [_jsx("button", { onClick: () => setDrawerOpen(false), "aria-label": "Cerrar menu", className: "absolute top-3 right-3 w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors z-10", style: { marginTop: 'env(safe-area-inset-top, 0px)' }, children: _jsx("span", { className: "material-symbols-outlined text-slate-500", children: "close" }) }), _jsx(SidebarContent, { onNavigate: () => setDrawerOpen(false), compact: true })] })] }), _jsxs("main", { id: "main-content", className: cn('flex-1 lg:overflow-y-auto lg:h-screen relative', 
                // Prevent horizontal overflow on mobile
                'overflow-x-hidden', 
                // Bottom safe area for phones with gesture bars
                'pb-[env(safe-area-inset-bottom)]'), children: [_jsx("div", { className: "hidden lg:flex absolute top-4 right-6 z-20 items-center gap-2", children: _jsx(NotificationsBell, {}) }), _jsx(GlobalJobsBanner, {}), _jsx(JobFailureToasts, {}), _jsx(Outlet, {})] })] }));
}
