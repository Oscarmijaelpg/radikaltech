import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, SectionTitle } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useFirstTimeProgress } from './useFirstTimeProgress';
import { cn } from '@/shared/utils/cn';

const SETUP_STEPS = [
  {
    id: 'complete_identity',
    step: 1,
    title: 'Cuéntanos sobre tu marca',
    description: 'Nombre, industria, qué vendes y qué te hace diferente.',
    icon: 'auto_awesome',
    gradient: 'from-pink-500 to-rose-500',
    cta: { label: 'Configurar', to: '/memory?tab=brand' },
  },
  {
    id: 'upload_logo',
    step: 2,
    title: 'Sube tu logo',
    description: 'Lo usaremos para extraer tu paleta de colores y personalizar todo.',
    icon: 'image',
    gradient: 'from-amber-500 to-orange-500',
    cta: { label: 'Subir logo', to: '/memory?tab=brand' },
  },
  {
    id: 'first_competitor',
    step: 3,
    title: 'Agrega un competidor',
    description: 'Sira lo empezará a monitorear automáticamente.',
    icon: 'radar',
    gradient: 'from-cyan-500 to-blue-600',
    cta: { label: 'Agregar', to: '/memory?tab=competitors' },
  },
  {
    id: 'first_chat',
    step: 4,
    title: 'Habla con tu equipo IA',
    description: 'Pregunta lo que quieras. Los agentes ya conocen tu marca.',
    icon: 'chat',
    gradient: 'from-violet-500 to-purple-600',
    cta: { label: 'Ir al chat', to: '/chat' },
  },
];

export function SetupWizard() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { loading, completedIds, allCompleted } = useFirstTimeProgress(activeProject?.id);

  const currentStep = useMemo(() => {
    for (const step of SETUP_STEPS) {
      if (!completedIds.has(step.id)) return step;
    }
    return null;
  }, [completedIds]);

  const completedCount = SETUP_STEPS.filter((s) => completedIds.has(s.id)).length;

  if (!activeProject || loading || allCompleted) return null;

  return (
    <Card className="relative overflow-hidden p-0 border-2 border-pink-100">
      {/* Progress header */}
      <div className="bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] px-6 py-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <SectionTitle className="opacity-80 text-white">Configura tu marca</SectionTitle>
            <h3 className="font-display font-black text-lg">
              Paso {completedCount + 1} de {SETUP_STEPS.length}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {SETUP_STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'w-8 h-2 rounded-full transition-all',
                  completedIds.has(s.id)
                    ? 'bg-white'
                    : s.id === currentStep?.id
                      ? 'bg-white/60 animate-pulse'
                      : 'bg-white/20',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-5 space-y-3">
        {SETUP_STEPS.map((step) => {
          const isDone = completedIds.has(step.id);
          const isCurrent = step.id === currentStep?.id;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl transition-all',
                isDone
                  ? 'bg-emerald-50 border border-emerald-100'
                  : isCurrent
                    ? 'bg-white border-2 border-pink-200 shadow-lg shadow-pink-100/50'
                    : 'bg-slate-50/50 border border-slate-100 opacity-50',
              )}
            >
              {/* Step indicator */}
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl grid place-items-center shrink-0 text-white shadow-md',
                  isDone
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                    : isCurrent
                      ? `bg-gradient-to-br ${step.gradient}`
                      : 'bg-gradient-to-br from-slate-300 to-slate-400',
                )}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {isDone ? 'check' : step.icon}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-bold',
                  isDone ? 'text-emerald-700 line-through' : 'text-slate-900',
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
              </div>

              {/* Action */}
              {isDone ? (
                <span className="text-emerald-500 shrink-0">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </span>
              ) : isCurrent ? (
                <Button size="sm" onClick={() => navigate(step.cta.to)} className="shrink-0">
                  {step.cta.label}
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Button>
              ) : (
                <span className="text-xs text-slate-400 shrink-0">Paso {step.step}</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
