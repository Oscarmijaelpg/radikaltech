import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Icon,
  SectionTitle,
  Skeleton,
  Spinner,
} from '@radikal/ui';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useProject } from '@/providers/ProjectProvider';
import { cn } from '@/shared/utils/cn';
import {
  type RecommendationStatus,
  useGenerateRecommendations,
  useRecommendations,
} from '../api/recommendations';
import { RecommendationCard } from '../components/RecommendationCard';
import { HelpButton } from '@/shared/ui/HelpButton';
import { AnalysisSubnav } from '@/shared/ui/AnalysisSubnav';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';

type Filter = 'all' | RecommendationStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Nuevas' },
  { value: 'saved', label: 'Guardadas' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completadas' },
];

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function RecommendationsPage() {
  const { activeProject } = useProject();
  const [filter, setFilter] = useState<Filter>('all');
  const q = useRecommendations(activeProject?.id);
  const generateMut = useGenerateRecommendations();

  const items = useMemo(() => {
    const all = q.data ?? [];
    const filtered =
      filter === 'all'
        ? all.filter((r) => r.status !== 'dismissed')
        : all.filter((r) => r.status === filter);
    return [...filtered].sort((a, b) => {
      const ia = IMPACT_ORDER[a.impact] ?? 9;
      const ib = IMPACT_ORDER[b.impact] ?? 9;
      if (ia !== ib) return ia - ib;
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    });
  }, [q.data, filter]);

  if (!activeProject) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-500">
            Selecciona un proyecto para ver sus sugerencias.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50/40 via-white to-violet-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative">
      {generateMut.isPending && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-6">
          <Card className="p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 grid place-items-center text-white mb-4 shadow-lg">
              <Spinner className="text-white" />
            </div>
            <h3 className="font-display font-black text-xl mb-2">
              Estudiando tu marca…
            </h3>
            <p className="text-sm text-slate-500">
              Cruzamos tus datos, competidores, noticias y contenido para proponer acciones
              concretas. Esto toma unos 30 segundos.
            </p>
          </Card>
        </div>
      )}

      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 md:space-y-8">
        <AnalysisSubnav />
        {/* Hero */}
        <FeatureHint
          id="recommendations-first-v1"
          title="Estas tarjetas son tus próximos pasos sugeridos"
          description="Kronos analiza tu marca y te dice qué hacer a continuación. Completa una y verás el impacto."
        >
        <header className="relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 p-6 md:p-10 text-white shadow-2xl">
          <div className="absolute top-4 right-4 z-20">
            <HelpButton
              title="Sugerencias"
              description="Tarjetas con acciones concretas que podrías tomar según los datos de tu marca."
              tips={[
                'Filtra por estado (nuevas, guardadas, en progreso, completadas).',
                'Genera nuevas sugerencias cuando tu marca cambie.',
                'Cada tarjeta se puede marcar como guardada o completada.',
              ]}
            />
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="min-w-0">
              <SectionTitle className="opacity-80 text-white mb-2">
                Sugerencias IA
              </SectionTitle>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">
                Sugerencias para ti
              </h1>
              <p className="text-white/85 mt-3 text-base md:text-lg max-w-2xl">
                Acciones específicas que podrías tomar con tu marca, generadas cruzando
                competidores, noticias, contenido y memoria del proyecto.
              </p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => generateMut.mutate({ project_id: activeProject.id })}
              disabled={generateMut.isPending}
              className="shrink-0 bg-white text-violet-700 hover:bg-white/90 shadow-xl"
            >
              <Icon name="auto_awesome" />
              Generar nuevas sugerencias
            </Button>
          </div>
        </header>
        </FeatureHint>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count =
              f.value === 'all'
                ? (q.data ?? []).filter((r) => r.status !== 'dismissed').length
                : (q.data ?? []).filter((r) => r.status === f.value).length;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all min-h-[44px] sm:min-h-0 sm:py-2',
                  active
                    ? 'bg-[hsl(var(--color-primary))] text-white shadow-lg shadow-[hsl(var(--color-primary)/0.25)]'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300',
                )}
              >
                {f.label}
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black',
                    active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {q.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-[28px]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-6">
            <CharacterEmpty
              character="kronos"
              title={
                filter === 'all'
                  ? 'Aún no analizo lo suficiente'
                  : 'Nada en esta categoría'
              }
              message={
                filter === 'all'
                  ? 'Usa la plataforma un rato y generaré insights accionables basados en tu marca, competidores y noticias.'
                  : 'Prueba con otro filtro o genera nuevas sugerencias.'
              }
              action={
                filter === 'all'
                  ? {
                      label: 'Generar sugerencias',
                      onClick: () => generateMut.mutate({ project_id: activeProject.id }),
                    }
                  : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
            {items.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
