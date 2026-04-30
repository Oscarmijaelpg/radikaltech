import { Card, Icon } from '@radikal/ui';
import { CountUp } from '@/shared/ui/CountUp';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { useProjectStats, useUserStats } from '../api/stats';
import { useProjectLogoWithBrightness } from '@/shared/hooks/useProjectLogo';
import { useUpcomingScheduledPosts } from '@/features/content/api/scheduler';
import { useRecommendations } from '@/features/recommendations/api/recommendations';
import { TrendingWidget } from '../components/TrendingWidget';
import { SetupWizard } from '@/shared/fte/FirstTimeExperience';
import { DashboardHero } from '../components/DashboardHero';
import { SmartActionsGrid } from '../components/SmartActionsGrid';
import { SuggestionsCard } from '../components/SuggestionsCard';
import { UpcomingPostsCard } from '../components/UpcomingPostsCard';
import { useSmartActions } from '../hooks/useSmartActions';
import { KPI_META } from '../kpi-meta';

const UPCOMING_POSTS_LIMIT = 5;

export function DashboardPage() {
  const { profile } = useAuth();
  const { activeProject } = useProject();
  const { url: logo, brightness: logoBrightness } = useProjectLogoWithBrightness(
    activeProject?.id,
  );

  const projectStats = useProjectStats(activeProject?.id ?? null);
  const userStats = useUserStats(!activeProject);
  const upcomingPosts = useUpcomingScheduledPosts(true, UPCOMING_POSTS_LIMIT);
  const recsQ = useRecommendations(activeProject?.id, { status: 'new' });
  const { actions: smartActions, loading: actionsLoading } = useSmartActions(activeProject?.id);

  const stats = activeProject ? projectStats.data : userStats.data;
  const loading = activeProject ? projectStats.isLoading : userStats.isLoading;
  const firstName = profile?.full_name?.split(' ')[0] ?? 'bienvenido';
  const activeProjectLabel = activeProject
    ? (activeProject.company_name ?? activeProject.name)
    : null;

  return (
    <div className="min-h-full overflow-x-hidden bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        <DashboardHero
          firstName={firstName}
          activeProjectLabel={activeProjectLabel}
          logo={logo}
          logoBrightness={logoBrightness}
          stats={stats}
          loading={loading}
        />

        <SmartActionsGrid actions={smartActions} loading={actionsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <SetupWizard />
          </div>

          <div className="space-y-4 sm:space-y-6">
            {activeProject && (
              <SuggestionsCard recommendations={recsQ.data} loading={recsQ.isLoading} />
            )}
            <UpcomingPostsCard posts={upcomingPosts.data} loading={upcomingPosts.isLoading} />
            {activeProject && <TrendingWidget projectId={activeProject.id} />}
          </div>
        </div>

        <div className="md:hidden pt-1 sm:pt-2">
          <p className="text-[10px] font-black uppercase tracking-wider opacity-40 mb-2 sm:mb-3">
            Tus números
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {loading
              ? KPI_META.map((m) => (
                  <div
                    key={m.key}
                    className="h-16 sm:h-[72px] rounded-2xl bg-slate-100 animate-pulse"
                  />
                ))
              : KPI_META.map((m) => (
                  <Card key={m.key} className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br ${m.color} grid place-items-center text-white shadow-sm shrink-0`}
                      >
                        <Icon name={m.icon} className="text-[14px] sm:text-[16px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-50">
                          {m.label}
                        </p>
                        <p className="font-bold text-lg sm:text-xl text-slate-900 leading-tight">
                          <CountUp end={stats?.[m.key] ?? 0} />
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
