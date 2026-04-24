import { Button, Card, Icon, Skeleton } from '@radikal/ui';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { usePageTour } from '@/shared/tour';
import { CompetitorModal } from './CompetitorModal';
import { CompetitionCharts } from './CompetitionCharts';
import { UserSocialAccountModal } from './UserSocialAccountModal';
import { CompetitorsBenchmarkTab } from './CompetitorsBenchmarkTab';
import { AnalyzeCompetitorConfirm } from './competitors-tab/AnalyzeCompetitorConfirm';
import { DetectCompetitorsModal } from './competitors-tab/DetectCompetitorsModal';
import { CompetitorCard } from './competitors-tab/CompetitorCard';
import { SubTabToggle } from './competitors-tab/SubTabToggle';
import { SuggestedCompetitorsSection } from './competitors-tab/SuggestedCompetitorsSection';
import { useCompetitorsTab } from './competitors-tab/useCompetitorsTab';

interface Props {
  projectId: string;
}

export function CompetitorsTab({ projectId }: Props) {
  const t = useCompetitorsTab(projectId);
  usePageTour('competitors');

  if (t.isLoading) return <Skeleton className="h-48" />;

  if (t.subTab === 'benchmark') {
    return (
      <div className="space-y-5">
        <div className="flex justify-start">
          <SubTabToggle value={t.subTab} onChange={t.setSubTab} />
        </div>
        <CompetitorsBenchmarkTab projectId={projectId} />
      </div>
    );
  }

  const analyzedIds = t.competitors.filter((c) => c.last_analyzed_at).map((c) => c.id);

  return (
    <div className="space-y-5 relative">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 sm:gap-2">
        <div data-tour="competitors-subtabs">
          <SubTabToggle value={t.subTab} onChange={t.setSubTab} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => t.setUserSocialOpen(true)}>
            <Icon name="hub" className="text-[18px]" />
            Mis redes sociales
          </Button>
          <Button
            variant="outline"
            onClick={t.openDetect}
            disabled={t.detecting}
            data-tour="competitors-detect"
          >
            <Icon name="auto_awesome" className="text-[18px]" />
            Detectar competidores con IA
          </Button>
          <Button onClick={t.openCreate} data-tour="competitors-add">
            <Icon name="add" className="text-[18px]" />
            Añadir competidor
          </Button>
        </div>
      </div>

      {t.suggested.length > 0 && (
        <SuggestedCompetitorsSection
          suggested={t.suggested}
          onApprove={t.onApprove}
          onReject={t.onReject}
          onApproveAll={t.onApproveAll}
          onRejectAll={t.onRejectAll}
          bulkApproving={t.bulkApproving}
          bulkRejecting={t.bulkRejecting}
        />
      )}

      {t.competitors.length === 0 ? (
        <Card className="p-6">
          <CharacterEmpty
            character="sira"
            title="Dame nombres, yo hago el trabajo"
            message="Añade a tus competidores (o deja que yo los descubra) y obtienes análisis estratégico en segundos."
            bullets={[
              'Añade un nombre y su sitio web (o solo el nombre)',
              'Analizo su web, redes y estrategia en ~30 segundos',
              'Ves fortalezas, debilidades, posts y comparativas',
            ]}
            action={{ label: 'Añadir mi primer competidor', onClick: t.openCreate }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {t.competitors.map((c) => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              analyzing={false}
              onAnalyze={t.onAnalyze}
              onViewAnalysis={t.onViewAnalysis}
              onEdit={t.openEdit}
              onDelete={t.onDelete}
            />
          ))}
        </div>
      )}

      {analyzedIds.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="analytics" className="text-[hsl(var(--color-primary))]" />
            <h3 className="text-sm font-bold text-slate-900">Benchmark de inteligencia social</h3>
          </div>
          <CompetitionCharts projectId={projectId} competitorIds={analyzedIds} />
        </div>
      )}

      <CompetitorModal
        open={t.modalOpen}
        onOpenChange={t.setModalOpen}
        initial={t.editing}
        onSubmit={t.onSubmit}
        saving={t.creating || t.updating}
      />

      <AnalyzeCompetitorConfirm
        open={!!t.pendingAnalyze}
        onOpenChange={(v) => {
          if (!v) t.onCancelAnalyze();
        }}
        competitor={t.pendingAnalyze ?? null}
        onConfirm={t.onConfirmAnalyze}
      />

      <UserSocialAccountModal
        open={t.userSocialOpen}
        onOpenChange={t.setUserSocialOpen}
        projectId={projectId}
      />

      <DetectCompetitorsModal
        open={t.detectModalOpen}
        onOpenChange={t.setDetectModalOpen}
        projectId={projectId}
        onStart={t.startDetect}
      />
    </div>
  );
}
