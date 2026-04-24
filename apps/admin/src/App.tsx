import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Button } from '@radikal/ui';
import { useAuth } from '@/providers/AuthProvider';
import { AuthPage } from '@/features/auth/pages/AuthPage';
import { AdminShell } from '@/shared/layout/AdminShell';
import { FullscreenLoader } from '@/shared/ui/FullscreenLoader';
import { AccessDenied } from '@/shared/ui/AccessDenied';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UsersPage = lazy(() =>
  import('@/features/users/pages/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const ProjectsPage = lazy(() =>
  import('@/features/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
);
const JobsPage = lazy(() =>
  import('@/features/jobs/pages/JobsPage').then((m) => ({ default: m.JobsPage })),
);
const ModerationPage = lazy(() =>
  import('@/features/moderation/pages/ModerationPage').then((m) => ({ default: m.ModerationPage })),
);
const BroadcastPage = lazy(() =>
  import('@/features/broadcast/pages/BroadcastPage').then((m) => ({ default: m.BroadcastPage })),
);
const FlagsPage = lazy(() =>
  import('@/features/flags/pages/FlagsPage').then((m) => ({ default: m.FlagsPage })),
);
const ScheduledReportsPage = lazy(() =>
  import('@/features/scheduled-reports/pages/ScheduledReportsPage').then((m) => ({
    default: m.ScheduledReportsPage,
  })),
);
const AuditPage = lazy(() =>
  import('@/features/audit/pages/AuditPage').then((m) => ({ default: m.AuditPage })),
);
const PricesPage = lazy(() =>
  import('@/features/prices/pages/PricesPage').then((m) => ({ default: m.PricesPage })),
);
const ConfigPage = lazy(() =>
  import('@/features/config/pages/ConfigPage').then((m) => ({ default: m.ConfigPage })),
);

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, profileError, refreshProfile, signOut } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!session) return <Navigate to="/auth" replace />;

  if (!profile && profileError) {
    return (
      <div className="min-h-screen grid place-items-center bg-[hsl(var(--color-bg))] p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
          <h2 className="font-display text-2xl font-bold">No pudimos cargar tu perfil</h2>
          <p className="text-sm text-slate-500">{profileError}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={refreshProfile}>Reintentar</Button>
            <Button variant="outline" onClick={signOut}>Cerrar sesión</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return <FullscreenLoader />;
  if (profile.role !== 'admin') return <AccessDenied />;
  return <>{children}</>;
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullscreenLoader />}>{children}</Suspense>;
}

export function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<AdminRoute><AdminShell /></AdminRoute>}>
        <Route path="/" element={<LazyRoute><DashboardPage /></LazyRoute>} />
        <Route path="/users" element={<LazyRoute><UsersPage /></LazyRoute>} />
        <Route path="/projects" element={<LazyRoute><ProjectsPage /></LazyRoute>} />
        <Route path="/jobs" element={<LazyRoute><JobsPage /></LazyRoute>} />
        <Route path="/moderation" element={<LazyRoute><ModerationPage /></LazyRoute>} />
        <Route path="/broadcast" element={<LazyRoute><BroadcastPage /></LazyRoute>} />
        <Route path="/scheduled-reports" element={<LazyRoute><ScheduledReportsPage /></LazyRoute>} />
        <Route path="/flags" element={<LazyRoute><FlagsPage /></LazyRoute>} />
        <Route path="/audit" element={<LazyRoute><AuditPage /></LazyRoute>} />
        <Route path="/prices" element={<LazyRoute><PricesPage /></LazyRoute>} />
        <Route path="/config" element={<LazyRoute><ConfigPage /></LazyRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
