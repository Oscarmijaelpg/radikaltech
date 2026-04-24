import React from 'react';
import { Button, Icon } from '@radikal/ui';

interface IntelligenceStatusProps {
  hasNews: boolean;
  hasCompetitors: boolean;
  isResearching: boolean;
  onResearch: () => void;
  onGenerateIdeas: () => void;
  isLoadingIdeas: boolean;
}

export const IntelligenceStatus: React.FC<IntelligenceStatusProps> = ({
  hasNews,
  hasCompetitors,
  isResearching,
  onResearch,
  onGenerateIdeas,
  isLoadingIdeas,
}) => {
  const isReady = hasNews && hasCompetitors;

  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/50 rounded-[3rem] p-10 shadow-2xl shadow-indigo-100/50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
        {/* Visual Avatar */}
        <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl border-4 border-white rotate-3 shrink-0">
          <img
            src="https://i.ibb.co/0RHH3JLc/Nexo-hablando.png"
            alt="Nexo Avatar"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">
            {isReady ? 'Inteligencia Lista' : 'Nexo necesita investigar'}
          </h3>
          <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed max-w-md">
            {isReady
              ? 'He analizado las noticias y competidores de tu industria. Estoy listo para generar ideas estratégicas de contenido.'
              : 'Para darte ideas de alto impacto, primero debo escanear el mercado, noticias recientes y tu competencia directa.'}
          </p>

          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {!isReady || isResearching ? (
              <Button
                onClick={onResearch}
                disabled={isResearching}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all h-auto"
              >
                {isResearching ? (
                  <span className="flex items-center gap-2">
                    <Icon name="progress_activity" className="animate-spin" />
                    Investigando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon name="search" />
                    Comenzar Investigación
                  </span>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={onGenerateIdeas}
                  disabled={isLoadingIdeas}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 transition-all h-auto"
                >
                  {isLoadingIdeas ? (
                    <span className="flex items-center gap-2">
                      <Icon name="psychology" className="animate-spin" />
                      Pensando Ideas...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Icon name="auto_awesome" />
                      Generar Ideas de Contenido
                    </span>
                  )}
                </Button>
                <button
                  onClick={onResearch}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors px-4"
                >
                  Refrescar Datos
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-col gap-3 shrink-0">
          <StatusBadge label="Noticias Sectoriales" active={hasNews} />
          <StatusBadge label="Análisis Competencia" active={hasCompetitors} />
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ label, active }: { label: string; active: boolean }) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
      active
        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
        : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
    }`}
  >
    <Icon name={active ? 'check_circle' : 'pending'} className="text-lg" />
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </div>
);
