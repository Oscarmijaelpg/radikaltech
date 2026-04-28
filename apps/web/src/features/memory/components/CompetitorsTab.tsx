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
import { SuggestedCompetitorsSection } from './competitors-tab/SuggestedCompetitorsSection';
import { useCompetitorsTab, type SubTab } from './competitors-tab/useCompetitorsTab';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  projectId: string;
  subTab: SubTab;
}

export function CompetitorsTab({ projectId, subTab }: Props) {
  const t = useCompetitorsTab(projectId);
  usePageTour('competitors');

  const { data: initialReport } = useQuery({
    queryKey: ['reports', 'competition', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // api.get ya devuelve el JSON { ok: true, data: T }
      const res = await api.get<{ data: Array<{ title: string; content: string; sourceData?: any }> }>(
        `/reports?project_id=${projectId}&type=competition`,
      );
      
      const reports = res.data || [];
      const found = reports.find((r) => 
        r.title === 'Reporte Inicial de Competencia' || 
        r.sourceData?.pipeline === 'initial-intelligence-comp'
      );

      return found ?? null;
    },
  });

  if (t.isLoading) return <Skeleton className="h-48" />;

  if (subTab === 'benchmark') {
    return (
      <div className="space-y-5">
        <CompetitorsBenchmarkTab projectId={projectId} />
      </div>
    );
  }

  if (subTab === 'diagnostic') {
    return (
      <div className="space-y-5">
        {initialReport ? (
          <Card className="p-6 sm:p-10 bg-gradient-to-br from-white to-blue-50/50 shadow-xl border-blue-100/50 rounded-[32px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 grid place-items-center">
                  <Icon name="history_edu" className="text-[28px]" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-slate-900">Diagnóstico Estratégico</h3>
                  <p className="text-sm text-slate-500">Análisis inicial de competencia generado por Sira</p>
                </div>
              </div>
            </div>
            <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline font-semibold" />
                  ),
                  code: ({ node, inline, className, children, ...props }: any) => {
                    if (inline) {
                      return <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 text-[0.9em] font-mono" {...props}>{children}</code>;
                    }
                    return (
                      <div className="my-8 overflow-x-auto rounded-3xl border border-slate-200/60 bg-slate-50/50 p-8 shadow-[inner_0_2px_4px_rgba(0,0,0,0.02)]">
                        <code className="text-sm font-mono text-slate-600 leading-relaxed block whitespace-pre" {...props}>
                          {children}
                        </code>
                      </div>
                    );
                  },
                  pre: ({ children }) => <>{children}</>
                }}
              >
                {initialReport.content || 'Reporte vacío.'}
              </ReactMarkdown>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <CharacterEmpty
              character="sira"
              title="Aún no hay diagnóstico"
              message="Completa el análisis de tu sitio web en Onboarding para que pueda generar este reporte para ti."
            />
          </Card>
        )}
      </div>
    );
  }

  const analyzedIds = t.competitors.filter((c) => c.last_analyzed_at).map((c) => c.id);

  return (
    <div className="space-y-5 relative">
      <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2">
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
