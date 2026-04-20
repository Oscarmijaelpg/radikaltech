import { useParams, useNavigate } from 'react-router-dom';
import { Card, Icon, Skeleton } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { exportToPDF } from '@/shared/utils/exportUtils';
import {
  useCompetitor,
  useCompetitorPosts,
  useCompetitorStats,
  useRegenerateNarrative,
  useSyncSocial,
} from '../api/memory';
import { AestheticSection } from '../components/competitor-report/AestheticSection';
import { DigitalPresence } from '../components/competitor-report/DigitalPresence';
import { ExecutiveSummary } from '../components/competitor-report/ExecutiveSummary';
import { HeaderSection } from '../components/competitor-report/HeaderSection';
import { OpportunitySection } from '../components/competitor-report/OpportunitySection';
import { PerformanceSection } from '../components/competitor-report/PerformanceSection';
import { StrengthsWeaknesses } from '../components/competitor-report/StrengthsWeaknesses';
import { TopPostsSection } from '../components/competitor-report/TopPostsSection';

const REPORT_DOM_ID = 'competitor-report-root';
const POSTS_LIMIT = 40;

export function CompetitorReportPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const competitorQ = useCompetitor(id);
  const statsQ = useCompetitorStats(id);
  const postsQ = useCompetitorPosts(id, { limit: POSTS_LIMIT });
  const syncSocial = useSyncSocial();
  const regenerate = useRegenerateNarrative();

  const competitor = competitorQ.data;

  const handleBack = () => navigate('/competitors');

  const handleDownload = async () => {
    if (!competitor) return;
    const safeName = competitor.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    await exportToPDF(REPORT_DOM_ID, `reporte-${safeName}.pdf`);
  };

  const handleSyncSocial = () => {
    if (!competitor) return;
    syncSocial.mutate({ id: competitor.id, project_id: competitor.project_id });
  };

  const handleRegenerate = () => {
    if (!competitor) return;
    regenerate.mutate({ id: competitor.id });
  };

  if (competitorQ.isLoading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-rose-50/40 via-white to-violet-50/40 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-48 w-full rounded-[28px]" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!competitor) {
    return (
      <div className="min-h-full bg-gradient-to-br from-rose-50/40 via-white to-violet-50/40 p-8">
        <Card className="max-w-xl mx-auto p-8 text-center">
          <Icon name="error" className="text-[40px] text-slate-300 mb-3 block" />
          <p className="text-sm text-slate-500">No encontramos este competidor.</p>
        </Card>
      </div>
    );
  }

  if (!activeProject || activeProject.id !== competitor.project_id) {
    return (
      <div className="min-h-full bg-gradient-to-br from-rose-50/40 via-white to-violet-50/40 p-8">
        <Card className="max-w-xl mx-auto p-8 text-center">
          <Icon name="info" className="text-[40px] text-slate-300 mb-3 block" />
          <p className="text-sm text-slate-500">
            Selecciona el proyecto correcto para ver este reporte.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-rose-50/40 via-white to-violet-50/40">
      <div
        id={REPORT_DOM_ID}
        className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-5 sm:space-y-6"
      >
        <HeaderSection
          competitor={competitor}
          onBack={handleBack}
          onDownload={() => void handleDownload()}
        />

        <ExecutiveSummary
          competitor={competitor}
          onRegenerate={handleRegenerate}
          regenerating={regenerate.isPending}
        />

        <DigitalPresence
          competitor={competitor}
          onSyncSocial={handleSyncSocial}
          syncing={syncSocial.isPending}
        />

        <PerformanceSection
          projectId={competitor.project_id}
          competitorId={competitor.id}
          stats={statsQ.data}
        />

        <TopPostsSection posts={postsQ.data} />

        <AestheticSection competitor={competitor} posts={postsQ.data} />

        <StrengthsWeaknesses competitor={competitor} />

        <OpportunitySection competitor={competitor} />
      </div>
    </div>
  );
}
