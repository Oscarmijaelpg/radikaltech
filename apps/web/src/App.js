import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner, Button } from '@radikal/ui';
import { useAuth } from './providers/AuthProvider';
import { AuthPage } from './features/auth/pages/AuthPage';
import { OnboardingPage } from './features/onboarding/pages/OnboardingPage';
import { AppShell } from './shared/layout/AppShell';
import { RouteLoader } from './shared/ui/RouteLoader';
// Lazy-loaded heavy pages
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const MemoryPage = lazy(() => import('./features/memory/pages/MemoryPage').then((m) => ({ default: m.MemoryPage })));
const ChatPage = lazy(() => import('./features/chat/pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const ContentPage = lazy(() => import('./features/content/pages/ContentPage').then((m) => ({ default: m.ContentPage })));
const ProjectsPage = lazy(() => import('./features/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const NewsPage = lazy(() => import('./features/news/pages/NewsPage').then((m) => ({ default: m.NewsPage })));
const TeamPage = lazy(() => import('./features/team').then((m) => ({ default: m.TeamPage })));
const ReportsPage = lazy(() => import('./features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const RecommendationsPage = lazy(() => import('./features/recommendations/pages/RecommendationsPage').then((m) => ({
    default: m.RecommendationsPage,
})));
const SettingsPage = lazy(() => import('./features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
function ProtectedRoute({ children, requireOnboarding = true }) {
    const { session, profile, loading, profileError, refreshProfile, signOut } = useAuth();
    if (loading)
        return _jsx(FullscreenLoader, {});
    if (!session)
        return _jsx(Navigate, { to: "/auth", replace: true });
    if (!profile && profileError) {
        return (_jsx("div", { className: "min-h-screen grid place-items-center bg-[hsl(var(--color-bg))] p-6", children: _jsxs("div", { className: "max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center", children: [_jsx("h2", { className: "font-display text-2xl font-bold mb-2", children: "No pudimos cargar tu perfil" }), _jsx("p", { className: "text-sm text-slate-500 mb-6", children: profileError }), _jsxs("div", { className: "flex gap-3 justify-center", children: [_jsx(Button, { onClick: refreshProfile, children: "Reintentar" }), _jsx(Button, { variant: "outline", onClick: signOut, children: "Cerrar sesi\u00F3n" })] })] }) }));
    }
    if (!profile)
        return _jsx(FullscreenLoader, {});
    if (requireOnboarding && !profile.onboarding_completed)
        return _jsx(Navigate, { to: "/onboarding", replace: true });
    return _jsx(_Fragment, { children: children });
}
function FullscreenLoader() {
    return (_jsx("div", { className: "min-h-screen grid place-items-center bg-[hsl(var(--color-bg))]", children: _jsx(Spinner, { size: "lg" }) }));
}
function LazyRoute({ children }) {
    return _jsx(Suspense, { fallback: _jsx(RouteLoader, {}), children: children });
}
export function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/auth", element: _jsx(AuthPage, {}) }), _jsx(Route, { path: "/onboarding", element: _jsx(ProtectedRoute, { requireOnboarding: false, children: _jsx(OnboardingPage, {}) }) }), _jsxs(Route, { element: _jsx(ProtectedRoute, { children: _jsx(AppShell, {}) }), children: [_jsx(Route, { path: "/", element: _jsx(LazyRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/memory", element: _jsx(LazyRoute, { children: _jsx(MemoryPage, {}) }) }), _jsx(Route, { path: "/chat", element: _jsx(LazyRoute, { children: _jsx(ChatPage, {}) }) }), _jsx(Route, { path: "/chat/:chatId", element: _jsx(LazyRoute, { children: _jsx(ChatPage, {}) }) }), _jsx(Route, { path: "/content", element: _jsx(LazyRoute, { children: _jsx(ContentPage, {}) }) }), _jsx(Route, { path: "/news", element: _jsx(LazyRoute, { children: _jsx(NewsPage, {}) }) }), _jsx(Route, { path: "/reports", element: _jsx(LazyRoute, { children: _jsx(ReportsPage, {}) }) }), _jsx(Route, { path: "/recommendations", element: _jsx(LazyRoute, { children: _jsx(RecommendationsPage, {}) }) }), _jsx(Route, { path: "/team", element: _jsx(LazyRoute, { children: _jsx(TeamPage, {}) }) }), _jsx(Route, { path: "/projects", element: _jsx(LazyRoute, { children: _jsx(ProjectsPage, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(LazyRoute, { children: _jsx(SettingsPage, {}) }) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
