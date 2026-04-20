import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spinner, Button } from '@radikal/ui';
import { useAuth } from './providers/AuthProvider';
import { AuthPage } from './features/auth/pages/AuthPage';
import { OnboardingPage } from './features/onboarding/pages/OnboardingPage';
import { AppShell } from './shared/layout/AppShell';
import { RouteLoader } from './shared/ui/RouteLoader';

// Lazy-loaded heavy pages
const DashboardPage = lazy(() =>
  import('./features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const MemoryPage = lazy(() =>
  import('./features/memory/pages/MemoryPage').then((m) => ({ default: m.MemoryPage })),
);
const CompetitorsPage = lazy(() =>
  import('./features/memory/pages/CompetitorsPage').then((m) => ({
    default: m.CompetitorsPage,
  })),
);
const CompetitorReportPage = lazy(() =>
  import('./features/memory/pages/CompetitorReportPage').then((m) => ({
    default: m.CompetitorReportPage,
  })),
);
const ChatPage = lazy(() =>
  import('./features/chat/pages/ChatPage').then((m) => ({ default: m.ChatPage })),
);
const ContentPage = lazy(() =>
  import('./features/content/pages/ContentPage').then((m) => ({ default: m.ContentPage })),
);
const ProjectsPage = lazy(() =>
  import('./features/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
);
const NewsPage = lazy(() =>
  import('./features/news/pages/NewsPage').then((m) => ({ default: m.NewsPage })),
);
const TeamPage = lazy(() =>
  import('./features/team').then((m) => ({ default: m.TeamPage })),
);
const ReportsPage = lazy(() =>
  import('./features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const RecommendationsPage = lazy(() =>
  import('./features/recommendations/pages/RecommendationsPage').then((m) => ({
    default: m.RecommendationsPage,
  })),
);
const SettingsPage = lazy(() =>
  import('./features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function ProtectedRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const { session, profile, loading, profileError, refreshProfile, signOut } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!session) return <Navigate to="/auth" replace />;

  if (!profile && profileError) {
    return (
      <div className="min-h-screen grid place-items-center bg-[hsl(var(--color-bg))] p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <h2 className="font-display text-2xl font-bold mb-2">No pudimos cargar tu perfil</h2>
          <p className="text-sm text-slate-500 mb-6">{profileError}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={refreshProfile}>Reintentar</Button>
            <Button variant="outline" onClick={signOut}>Cerrar sesión</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return <FullscreenLoader />;

  if (requireOnboarding && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function FullscreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-[hsl(var(--color-bg))]">
      <Spinner size="lg" />
    </div>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}

export function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><OnboardingPage /></ProtectedRoute>} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<LazyRoute><DashboardPage /></LazyRoute>} />
        <Route path="/memory" element={<LazyRoute><MemoryPage /></LazyRoute>} />
        <Route path="/competitors" element={<LazyRoute><CompetitorsPage /></LazyRoute>} />
        <Route path="/competitors/:id/report" element={<LazyRoute><CompetitorReportPage /></LazyRoute>} />
        <Route path="/chat" element={<LazyRoute><ChatPage /></LazyRoute>} />
        <Route path="/chat/:chatId" element={<LazyRoute><ChatPage /></LazyRoute>} />
        <Route path="/content" element={<LazyRoute><ContentPage /></LazyRoute>} />
        <Route path="/news" element={<LazyRoute><NewsPage /></LazyRoute>} />
        <Route path="/reports" element={<LazyRoute><ReportsPage /></LazyRoute>} />
        <Route path="/recommendations" element={<LazyRoute><RecommendationsPage /></LazyRoute>} />
        <Route path="/team" element={<LazyRoute><TeamPage /></LazyRoute>} />
        <Route path="/projects" element={<LazyRoute><ProjectsPage /></LazyRoute>} />
        <Route path="/settings" element={<LazyRoute><SettingsPage /></LazyRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
