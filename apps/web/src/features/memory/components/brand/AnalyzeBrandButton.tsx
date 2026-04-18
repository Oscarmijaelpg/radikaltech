import { useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Spinner,
} from '@radikal/ui';
import { useAnalyzeBrand } from '../../api/memory';

const STAGE_LABELS = [
  'Scrape web',
  'Logo',
  'Imágenes',
  'Social',
  'Síntesis',
];

export function AnalyzeBrandButton({ projectId }: { projectId: string }) {
  const analyze = useAnalyzeBrand();
  const [overlay, setOverlay] = useState(false);
  const [stage, setStage] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleClick = async () => {
    setOverlay(true);
    setStage(0);
    setSummary(null);
    stageTimer.current = setInterval(() => {
      setStage((prev) => (prev < STAGE_LABELS.length - 1 ? prev + 1 : prev));
    }, 8000);
    try {
      // El endpoint ahora retorna inmediato (jobId) y el orchestrator corre en background.
      // useActiveJobs (con polling) muestra el progreso real en el banner superior y refresca todo al terminar.
      await analyze.mutateAsync({ project_id: projectId });
      setStage(STAGE_LABELS.length - 1);
      setSummary(
        '✓ Análisis iniciado. Verás los resultados aparecer en esta pantalla en los próximos 30-60 segundos.',
      );
      setTimeout(() => {
        setOverlay(false);
        setSummary(null);
        setStage(0);
      }, 2500);
    } catch {
      setSummary('Error en el análisis. Revisa los logs.');
    } finally {
      if (stageTimer.current) clearInterval(stageTimer.current);
    }
  };

  const close = () => {
    setOverlay(false);
    setSummary(null);
    setStage(0);
  };

  return (
    <>
      <Button variant="primary" onClick={handleClick} disabled={analyze.isPending}>
        {analyze.isPending ? (
          <Spinner />
        ) : (
          <Icon name="auto_awesome" className="text-[18px]" />
        )}
        Actualizar con IA
      </Button>
      <Dialog open={overlay} onOpenChange={(v) => (v ? null : close())}>
        <DialogContent className="max-w-[100vw] sm:max-w-lg h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Análisis completo de marca</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {STAGE_LABELS.map((label, i) => {
              const done = summary ? true : i < stage;
              const active = !summary && i === stage;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-black text-white ${
                      done
                        ? 'bg-gradient-to-br from-pink-500 to-cyan-500'
                        : active
                          ? 'bg-slate-400 animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      active ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
            {summary && (
              <p className="text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
                {summary}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={!summary && analyze.isPending}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
