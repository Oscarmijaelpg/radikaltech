import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Icon,
  Spinner,
} from '@radikal/ui';
import { useActiveJobs } from '../../api/memory/jobs';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  /** Invocado al confirmar el disparo. Debe hacer la POST fire-and-forget y resolver rápido. */
  onStart: () => Promise<unknown>;
  /** Número de competidores que se esperan al terminar (si se puede calcular). */
  onDone?: () => void;
}

type Phase = 'idle' | 'starting' | 'running' | 'finishing' | 'done';

const STAGES = [
  'Leyendo el perfil de tu empresa',
  'Consultando búsqueda web con IA',
  'Cruzando referencias de 4 ángulos',
  'Filtrando wikipedia, redes y directorios',
  'Organizando resultados',
];

const ESTIMATED_SECONDS = 75;

export function DetectCompetitorsModal({
  open,
  onOpenChange,
  projectId,
  onStart,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  const { data: activeJobs = [] } = useActiveJobs(projectId);
  const job = useMemo(
    () => activeJobs.find((j) => j.kind === 'auto_competitor_detect'),
    [activeJobs],
  );

  useEffect(() => {
    if (!open) {
      setPhase('idle');
      setError(null);
      setElapsed(0);
      startedAtRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (phase !== 'running' && phase !== 'finishing') return;
    const iv = setInterval(() => {
      if (startedAtRef.current) {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase === 'running' && !job && elapsed > 3) {
      setPhase('done');
      onDone?.();
    }
  }, [job, phase, elapsed, onDone]);

  const handleStart = async () => {
    setPhase('starting');
    setError(null);
    startedAtRef.current = Date.now();
    try {
      await onStart();
      setPhase('running');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setPhase('idle');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const progressPct =
    phase === 'running' || phase === 'finishing'
      ? Math.min(95, Math.round((elapsed / ESTIMATED_SECONDS) * 100))
      : phase === 'done'
        ? 100
        : 0;

  const currentStageIdx =
    phase === 'running' || phase === 'finishing'
      ? Math.min(STAGES.length - 1, Math.floor((progressPct / 100) * STAGES.length))
      : -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="auto_awesome" className="text-cyan-600" />
            Detector de competidores con IA
          </DialogTitle>
        </DialogHeader>

        {phase === 'idle' && (
          <div className="py-2 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              Sira va a consultar búsqueda web para identificar{' '}
              <strong>entre 5 y 8 competidores reales</strong> basándose en tu industria,
              mercado, productos y propuesta de valor. Verifica que cada uno sea una marca
              vigente y filtra directorios, wikipedia y redes sociales.
            </p>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5">
                <Icon name="schedule" className="text-[14px] text-slate-500" />
                Tarda aproximadamente <strong>{ESTIMATED_SECONDS}s</strong>.
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name="savings" className="text-[14px] text-slate-500" />
                Consume créditos al iniciar (se reembolsan si la IA falla).
              </div>
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleStart}>
                <Icon name="play_arrow" className="text-[16px]" />
                Iniciar detección
              </Button>
            </div>
          </div>
        )}

        {phase === 'starting' && (
          <div className="py-6 flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-slate-600">Iniciando pipeline...</p>
          </div>
        )}

        {(phase === 'running' || phase === 'finishing') && (
          <div className="py-2 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Buscando competidores...
                </span>
                <span className="text-xs tabular-nums text-slate-500">
                  {elapsed}s / ~{ESTIMATED_SECONDS}s
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <ul className="space-y-1.5">
              {STAGES.map((stage, i) => {
                const state =
                  i < currentStageIdx ? 'done' : i === currentStageIdx ? 'active' : 'pending';
                return (
                  <li
                    key={stage}
                    className="flex items-center gap-2 text-sm"
                  >
                    {state === 'done' && (
                      <Icon name="check_circle" className="text-[16px] text-emerald-500" />
                    )}
                    {state === 'active' && <Spinner size="sm" />}
                    {state === 'pending' && (
                      <Icon name="radio_button_unchecked" className="text-[16px] text-slate-300" />
                    )}
                    <span
                      className={
                        state === 'done'
                          ? 'text-slate-500 line-through'
                          : state === 'active'
                            ? 'text-slate-900 font-medium'
                            : 'text-slate-400'
                      }
                    >
                      {stage}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-between pt-3 border-t border-slate-100 gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Seguir trabajando
                <span className="text-xs opacity-70 ml-1">(te avisamos al terminar)</span>
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Spinner size="sm" />
                Esperando aquí
              </div>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="py-2 space-y-4">
            <div className="flex items-center gap-3">
              <Icon name="check_circle" className="text-[32px] text-emerald-500" />
              <div>
                <h3 className="font-semibold text-slate-900">¡Listo!</h3>
                <p className="text-sm text-slate-600">
                  Los competidores detectados aparecieron en la sección "Sugeridos por IA" debajo.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Ver resultados</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
