import { useMemo, useState } from 'react';
import {
  Card,
  Icon,
  SectionTitle,
  Skeleton,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { cn } from '@/shared/utils/cn';
import { useReports, type Report, type ReportType } from '../api/reports';
import { ReportReader } from '../components/ReportReader';
import { ReportGeneratorButton } from '../components/ReportGeneratorButton';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { ScheduledReportsSection } from '../components/ScheduledReportsSection';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
import { Breadcrumb } from '@/shared/ui/Breadcrumb';
import { AnalysisSubnav } from '@/shared/ui/AnalysisSubnav';

type Filter = 'all' | ReportType;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'competition', label: 'Competencia' },
  { value: 'news', label: 'Noticias' },
  { value: 'monthly_audit', label: 'Auditoría' },
  { value: 'brand_strategy', label: 'Estrategia' },
  { value: 'general', label: 'General' },
];

const TYPE_COLORS: Record<ReportType, string> = {
  competition: 'bg-rose-500',
  news: 'bg-cyan-500',
  monthly_audit: 'bg-amber-500',
  brand_strategy: 'bg-violet-500',
  general: 'bg-slate-400',
};

function sortDesc(a: Report, b: Report) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function ReportsPage() {
  const { activeProject } = useProject();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const reportsQ = useReports(activeProject?.id);

  const selectedReport = useMemo(
    () => (reportsQ.data ?? []).find((r) => r.id === selectedId) ?? null,
    [reportsQ.data, selectedId],
  );

  const filtered = useMemo(() => {
    const items = [...(reportsQ.data ?? [])].sort(sortDesc);
    if (filter === 'all') return items;
    return items.filter((r) => r.reportType === filter);
  }, [reportsQ.data, filter]);

  const handleCreated = (r: { id: string }) => {
    setSelectedId(r.id);
  };

  if (!activeProject) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-500">Selecciona un proyecto para ver tus reportes.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-violet-50/40 via-white to-pink-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <AnalysisSubnav />
        {selectedReport && (
          <div className="mb-3">
            <Breadcrumb
              items={[
                { label: 'Reportes', onClick: () => setSelectedId(null) },
                { label: selectedReport.title },
              ]}
            />
          </div>
        )}
        <FeatureHint
          id="reports-first-v1"
          title="Los reportes consolidan todo el análisis"
          description="Genera documentos estratégicos de marca, competencia o noticias. Los puedes descargar y compartir."
        >
        <header className="mb-6 md:mb-8 relative rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 md:p-10 text-white shadow-2xl">
          {/* Wrapper interno con overflow-hidden solo para los blobs decorativos;
              el header NO recorta para permitir que los dropdowns (Nuevo reporte)
              se salgan del borde sin cortarse. */}
          <div className="absolute inset-0 overflow-hidden rounded-[28px] md:rounded-[32px] pointer-events-none">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3" />
          </div>
          <div className="absolute top-4 right-4 z-20">
            <HelpButton
              title="Reportes"
              description="Consolida información estratégica sobre tu marca, competencia y noticias en documentos descargables."
              tips={[
                'Filtra por tipo (competencia, noticias, auditoría, estrategia).',
                'Genera nuevos reportes con el botón del hero.',
                'Programa reportes recurrentes desde la sección Agendados.',
              ]}
            />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
            <div>
              <SectionTitle className="opacity-80 text-white mb-2">
                Inteligencia consolidada
              </SectionTitle>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">
                Reportes estratégicos
              </h1>
              <p className="text-white/80 mt-3 text-base md:text-lg max-w-2xl">
                Informes accionables sobre tu marca, tu competencia y tu industria.
              </p>
            </div>
            <ReportGeneratorButton projectId={activeProject.id} onCreated={handleCreated} />
          </div>
        </header>
        </FeatureHint>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 md:gap-6 min-w-0">
          <aside>
            <Card className="p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-3rem)] overflow-y-auto">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      'px-2.5 py-1.5 text-[11px] font-semibold rounded-full transition-colors min-h-[36px] sm:min-h-0 sm:py-1',
                      filter === f.value
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {reportsQ.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center">
                  <Icon name="description" className="text-[28px] text-slate-300" />
                  <p className="text-xs text-slate-400 mt-2">Aún no hay reportes.</p>
                  <p className="text-[11px] text-slate-400">Genera uno con el botón de arriba.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-2',
                          selectedId === r.id
                            ? 'bg-violet-50 border border-violet-200'
                            : 'hover:bg-slate-50',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 w-2 h-2 rounded-full shrink-0',
                            TYPE_COLORS[r.reportType],
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {r.title}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(r.createdAt).toLocaleDateString('es', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>

          <section>
            {selectedId ? (
              <ReportReader
                reportId={selectedId}
                onDeleted={() => setSelectedId(null)}
              />
            ) : (
              <Card className="p-6">
                <CharacterEmpty
                  character="kronos"
                  title="Elige o genera un reporte"
                  message="Consolido información estratégica sobre tu marca, competencia o industria. Tú eliges, yo analizo."
                />
              </Card>
            )}

            <div className="mt-6">
              <ScheduledReportsSection projectId={activeProject.id} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
