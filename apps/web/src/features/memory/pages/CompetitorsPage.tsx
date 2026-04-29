import { useState } from 'react';
import { Card, Icon, SectionTitle } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { useProject } from '@/providers/ProjectProvider';
import { HelpButton } from '@/shared/ui/HelpButton';
import { AnalysisSubnav } from '@/shared/ui/AnalysisSubnav';
import { CompetitorsTab } from '../components/CompetitorsTab';
import type { SubTab } from '../components/competitors-tab/useCompetitorsTab';

export function CompetitorsPage() {
  const { activeProject } = useProject();
  const [subTab, setSubTab] = useState<SubTab>('diagnostic');

  return (
    <div className="min-h-full bg-gradient-to-br from-rose-50/40 via-white to-violet-50/40">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <AnalysisSubnav />
        <header className="mb-6 md:mb-8 relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-rose-500 to-fuchsia-600 p-6 md:p-10 text-white shadow-2xl">
          <div className="absolute top-4 right-4 z-20">
            <HelpButton
              title="Competencia"
              description="Analiza marcas que compiten contigo. Ve su presencia digital, estilo, engagement y saca insights accionables."
              tips={[
                'Añade nombre y sitio web — Sira investiga el resto.',
                'O usa "Detectar competidores con IA" para empezar sin nombres.',
                'Cada análisis incluye estadísticas sociales, posts y estética visual.',
              ]}
            />
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
            <div className="flex-1">
              <SectionTitle className="opacity-80 text-white mb-2">
                Inteligencia competitiva
              </SectionTitle>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">
                Competencia
              </h1>
              <p className="text-white/80 mt-3 text-base md:text-lg max-w-2xl">
                Sira investiga a tus competidores, scrapea sus redes y te entrega un reporte con
                fortalezas, debilidades y oportunidades.
              </p>

              {activeProject && (
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-4 items-center">
                  <div className="inline-flex p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-x-auto max-w-full">
                    <button
                      onClick={() => setSubTab('diagnostic')}
                      className={cn(
                        'px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                        subTab === 'diagnostic' ? 'bg-white text-rose-600 shadow-lg' : 'text-white/70 hover:text-white',
                      )}
                    >
                      Diagnóstico IA
                    </button>
                    <button
                      onClick={() => setSubTab('list')}
                      className={cn(
                        'px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                        subTab === 'list' ? 'bg-white text-rose-600 shadow-lg' : 'text-white/70 hover:text-white',
                      )}
                    >
                      Lista
                    </button>
                    <button
                      onClick={() => setSubTab('benchmark')}
                      className={cn(
                        'px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                        subTab === 'benchmark' ? 'bg-white text-rose-600 shadow-lg' : 'text-white/70 hover:text-white',
                      )}
                    >
                      Benchmark
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {!activeProject ? (
          <Card className="p-12 text-center">
            <Icon name="insights" className="text-[40px] text-slate-300 mb-3 block" />
            <p className="text-sm text-slate-500">
              Selecciona un proyecto para ver su competencia.
            </p>
          </Card>
        ) : (
          <CompetitorsTab projectId={activeProject.id} subTab={subTab} />
        )}
      </div>
    </div>
  );
}
