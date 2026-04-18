import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, SectionTitle, Spinner } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import { useFirstTimeProgress } from './useFirstTimeProgress';
import { FIRST_DAY_TASKS, MAX_POINTS, LEVELS } from './tasks';
import { Confetti } from './Confetti';

export const FTE_HIDDEN_KEY = 'radikal-fte-hidden';
const FTE_COMPLETED_AT_KEY = 'radikal-fte-completed-at';
const FTE_LEVEL_SEEN_KEY = 'radikal-fte-level-seen';
const FTE_CELEBRATED_KEY = 'radikal-fte-celebrated';

function isHidden(): boolean {
  try {
    if (window.localStorage.getItem(FTE_HIDDEN_KEY) === '1') return true;
    const completedAt = window.localStorage.getItem(FTE_COMPLETED_AT_KEY);
    if (completedAt) {
      const t = Number(completedAt);
      if (!Number.isNaN(t) && Date.now() - t > 24 * 60 * 60 * 1000) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function FirstDayCard() {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const { toast } = useToast();
  const { loading, progress, completedIds, totalTasks, completedTasks, totalPoints, level, nextTaskId, allCompleted } =
    useFirstTimeProgress(activeProject?.id);

  const [hidden, setHidden] = useState<boolean>(() => isHidden());
  const [showFinalConfetti, setShowFinalConfetti] = useState(false);
  const [showFinalOverlay, setShowFinalOverlay] = useState(false);

  // Level-up toast + easter egg (100 points)
  useEffect(() => {
    if (!progress) return;
    try {
      const seenLabel = window.localStorage.getItem(FTE_LEVEL_SEEN_KEY);
      if (seenLabel !== level.label) {
        if (seenLabel !== null) {
          // Not the very first visit — celebrate a new level unlock
          toast({
            title: `Nuevo nivel: ${level.label} ${level.emoji}`,
            description: 'Sigue completando pasos para desbloquear más.',
            variant: 'success',
          });
        }
        window.localStorage.setItem(FTE_LEVEL_SEEN_KEY, level.label);
      }
      if (totalPoints >= MAX_POINTS) {
        const celebrated = window.localStorage.getItem(FTE_CELEBRATED_KEY);
        if (!celebrated) {
          window.localStorage.setItem(FTE_CELEBRATED_KEY, '1');
          setShowFinalConfetti(true);
          setShowFinalOverlay(true);
        }
      }
      if (allCompleted && !window.localStorage.getItem(FTE_COMPLETED_AT_KEY)) {
        window.localStorage.setItem(FTE_COMPLETED_AT_KEY, String(Date.now()));
      }
    } catch {
      /* ignore */
    }
  }, [progress, level.label, level.emoji, totalPoints, allCompleted, toast]);

  const orderedTasks = useMemo(() => FIRST_DAY_TASKS, []);

  if (hidden || !activeProject) return null;

  const handleHide = () => {
    try {
      window.localStorage.setItem(FTE_HIDDEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  const progressPct = MAX_POINTS > 0 ? Math.min(100, Math.round((totalPoints / MAX_POINTS) * 100)) : 0;

  return (
    <>
      {showFinalConfetti && (
        <Confetti durationMs={3000} onDone={() => setShowFinalConfetti(false)} />
      )}

      <Card className="relative overflow-hidden p-6 md:p-7 bg-gradient-to-br from-pink-50 via-white to-cyan-50 border-2 border-pink-100">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-pink-400/20 to-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <SectionTitle className="text-pink-600 mb-1">
              Tu primer día en Radikal
            </SectionTitle>
            <h3 className="font-display font-black text-xl md:text-2xl text-slate-900">
              Sigue estos pasos y despega tu marca
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {loading
                ? 'Calculando tu progreso...'
                : `${completedTasks}/${totalTasks} completadas · ${totalPoints} puntos`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${level.color} text-white text-xs font-black shadow-md`}
            >
              <span>{level.emoji}</span>
              <span>{level.label}</span>
            </span>
            <button
              type="button"
              onClick={handleHide}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
            >
              Ocultar
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden mb-6">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {loading ? (
          <div className="py-8 grid place-items-center">
            <Spinner />
          </div>
        ) : (
          <ul className="space-y-2">
            {orderedTasks.map((task) => {
              const isDone = completedIds.has(task.id);
              const isCurrent = !isDone && task.id === nextTaskId;
              return (
                <li
                  key={task.id}
                  className={[
                    'relative flex items-center gap-3 p-3 md:p-4 rounded-2xl transition-all',
                    isDone
                      ? 'bg-emerald-50/60 border border-emerald-100'
                      : isCurrent
                        ? 'bg-white border border-pink-200 ring-2 ring-pink-300/40 shadow-md'
                        : 'bg-white/60 border border-slate-100 opacity-60',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white',
                      isDone
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                        : isCurrent
                          ? 'bg-gradient-to-br from-pink-500 to-rose-500'
                          : 'bg-gradient-to-br from-slate-300 to-slate-400',
                    ].join(' ')}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isDone ? 'check' : task.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={[
                        'text-sm font-bold truncate',
                        isDone ? 'text-emerald-700 line-through' : 'text-slate-900',
                      ].join(' ')}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {task.description}
                      {isCurrent && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>~
                          {task.estimatedMinutes} min
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-[11px] font-black text-slate-400">
                    +{task.points}
                  </div>
                  {isCurrent && (
                    <Button size="sm" onClick={() => navigate(task.cta.to)}>
                      {task.cta.label}
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {showFinalOverlay && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="relative max-w-lg w-full p-8 text-center bg-gradient-to-br from-pink-50 via-white to-cyan-50">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="font-display font-black text-2xl text-slate-900 mb-2">
              ¡Enhorabuena! Has completado tu primer día
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Desbloqueaste el nivel{' '}
              <span className="font-bold">
                {LEVELS[LEVELS.length - 1]!.label} {LEVELS[LEVELS.length - 1]!.emoji}
              </span>
              . Ahora tu marca está lista para crecer de verdad.
            </p>
            <Button onClick={() => setShowFinalOverlay(false)}>Cerrar</Button>
          </Card>
        </div>
      )}
    </>
  );
}
