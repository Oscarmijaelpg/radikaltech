import { useState, useRef, useEffect } from 'react';
import { Button, Card, Icon, Skeleton, Spinner } from '@radikal/ui';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CHARACTERS } from '@/shared/characters';
import { markdownComponents } from '@/features/reports/components/reader/markdown';

import { useToast } from '@/shared/ui/Toaster';
import { cn } from '@/shared/utils/cn';
import { repairMarkdownTable } from '@/shared/utils';

interface Props {
  projectId: string;
  subTab: SubTab;
}

export function CompetitorsTab({ projectId, subTab }: Props) {
  const t = useCompetitorsTab(projectId) as any;
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  usePageTour('competitors');

  const queryClient = useQueryClient();
  const prevRefreshing = useRef(false);

  const { data: activeJobs } = useQuery({
    queryKey: ['active-jobs', 'competition', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; kind: string; status: string; metadata?: any }> }>(
        `/jobs/active?project_id=${projectId}`,
      );
      return res.data || [];
    },
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some(j => j.kind === 'competition-refresh');
      return hasActive ? 3000 : 8000;
    }
  });

  const activeJob = activeJobs?.find(j => j.kind === 'competition-refresh');
  const isRefreshingJob = !!activeJob;
  const currentStep = (activeJob?.metadata as any)?.step || 'initializing';

  useEffect(() => {
    if (prevRefreshing.current && !isRefreshingJob) {
      queryClient.invalidateQueries({ queryKey: ['reports', 'competition', projectId] });
      queryClient.invalidateQueries({ queryKey: ['recent-jobs', 'competition', projectId] });
    }
    prevRefreshing.current = isRefreshingJob;
  }, [isRefreshingJob, projectId, queryClient]);

  const { data: recentJobs } = useQuery({
    queryKey: ['recent-jobs', 'competition', projectId],
    enabled: !!projectId && !isRefreshingJob,
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; kind: string; status: string; error?: string }> }>(
        `/jobs/recent?project_id=${projectId}&limit=1`,
      );
      return res.data || [];
    },
    staleTime: 0,
  });

  const lastJob = recentJobs?.[0];
  const hasError = lastJob?.kind === 'competition-refresh' && lastJob?.status === 'failed';

  const stepMessages: Record<string, string> = {
    'initializing': 'Iniciando motores de investigación...',
    'generating-prompt': 'Diseñando estrategia de búsqueda personalizada...',
    'searching-kimi': 'Escaneando la web en tiempo real (2025-2026)...',
    'saving-report': 'Redactando reporte estratégico McKinsey...',
    'extracting-competitors': 'Extrayendo competidores y actualizando fichas...',
    'completed': '¡Análisis finalizado!',
  };

  const { data: initialReport } = useQuery({
    queryKey: ['reports', 'competition', projectId],
    enabled: !!projectId && !isRefreshingJob,
    queryFn: async () => {
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

  const handleRefresh = async () => {
    if (refreshing || isRefreshingJob) return;
    setRefreshing(true);
    try {
      await api.post('/ai/refresh-competition-report', { project_id: projectId });
      // Forzar refetch inmediato para mostrar el estado "corriendo" sin esperar el intervalo
      queryClient.removeQueries({ queryKey: ['recent-jobs', 'competition', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['active-jobs', 'competition', projectId] });
      toast({
        title: 'Actualización iniciada',
        description: 'Sira está analizando la competencia. Recibirás una notificación cuando el reporte McKinsey esté listo.',
        variant: 'success'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la actualización del diagnóstico.',
        variant: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (t.isLoading) return <Skeleton className="h-48" />;

  if (subTab === 'benchmark') {
    return (
      <div className="space-y-5">
        <CompetitorsBenchmarkTab projectId={projectId} />
      </div>
    );
  }

  if (subTab === 'diagnostic') {
    if (isRefreshingJob) {
      return (
        <Card className="p-12 flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-inner">
          <div className="w-32 h-32 rounded-[32px] bg-gradient-to-br from-cyan-400 to-blue-500 p-[3px] animate-pulse">
            <div className="w-full h-full rounded-[29px] bg-white overflow-hidden grid place-items-center">
              <img src={CHARACTERS.sira.image} alt="Sira" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="max-w-md">
            <h3 className="text-2xl font-display font-black text-slate-900 mb-2">Buscando información actualizada</h3>
            <p className="text-slate-600 leading-relaxed">
              Sira está realizando una investigación profunda de mercado para 2025-2026. 
              Este proceso puede tardar un par de minutos mientras navega por la web.
            </p>
          </div>
          <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm bg-cyan-50 px-4 py-2 rounded-full border border-cyan-100">
            <Icon name="refresh" className="animate-spin text-lg" />
            {stepMessages[currentStep] || 'Analizando competencia...'}
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-5">
        {hasError && (
          <Card className="p-4 bg-red-50 border-red-100 text-red-700 flex items-start justify-between gap-3 rounded-2xl mb-4">
            <div className="flex items-start gap-3">
              <Icon name="warning" className="text-xl shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">La última actualización falló</p>
                <p className="opacity-80 mt-0.5">
                  {lastJob?.error?.includes('startup cleanup') || lastJob?.error?.includes('proceso que lo creó')
                    ? 'El servidor se reinició mientras procesaba el análisis.'
                    : lastJob?.error?.includes('timeout') || lastJob?.error?.includes('AbortError')
                    ? 'La búsqueda tardó demasiado. Inténtalo de nuevo.'
                    : lastJob?.error || 'Ocurrió un error inesperado al contactar con el buscador inteligente.'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0 border-red-200 text-red-700 hover:bg-red-100"
            >
              {refreshing ? <Spinner size="sm" /> : <Icon name="refresh" className="text-base" />}
              Reintentar
            </Button>
          </Card>
        )}
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="rounded-xl border-cyan-200 text-cyan-700 hover:bg-cyan-50 relative z-10"
              >
                <Icon name="refresh" className={cn("mr-2", refreshing && "animate-spin")} />
                {refreshing ? 'Actualizando...' : 'Actualizar análisis'}
              </Button>
            </div>
            <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  ...markdownComponents,
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
                }}
              >
                {repairMarkdownTable(initialReport.content || 'Reporte vacío.')}
              </ReactMarkdown>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <CharacterEmpty
              character="sira"
              title="Aún no hay diagnóstico"
              message="Completa el análisis de tu sitio web en Onboarding para que pueda generar este reporte para ti."
              action={{ label: 'Generar diagnóstico ahora', onClick: handleRefresh }}
            />
          </Card>
        )}
      </div>
    );
  }

  const analyzedIds = (t.competitors as any[]).filter((c: any) => c.last_analyzed_at).map((c: any) => c.id);

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
          {(t.competitors as any[]).map((c: any) => (
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
