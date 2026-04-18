import { Card } from '@radikal/ui';
import { JOB_LABELS } from './utils';

export function ActiveJobsBanner({
  jobs,
}: {
  jobs: Array<{ kind: string; id: string; created_at: string }>;
}) {
  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-r from-pink-50 via-cyan-50 to-pink-50 border-[hsl(var(--color-primary)/0.3)]">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shadow-lg shrink-0">
          <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]">
            Sira está trabajando
          </p>
          <p className="font-display text-base sm:text-lg font-bold text-slate-900">
            {jobs.length === 1
              ? (JOB_LABELS[jobs[0]!.kind]?.label ?? 'Procesando...')
              : `${jobs.length} análisis en curso`}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {jobs.slice(0, 6).map((j) => {
              const meta = JOB_LABELS[j.kind] ?? { label: j.kind, icon: 'bolt' };
              return (
                <span
                  key={j.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 text-[11px] font-semibold text-slate-700 border border-slate-200"
                >
                  <span className="material-symbols-outlined text-[14px] text-[hsl(var(--color-primary))]">
                    {meta.icon}
                  </span>
                  {meta.label}
                </span>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Esto puede tardar hasta 30-60 segundos. Los datos aparecerán automáticamente cuando estén listos.
          </p>
        </div>
      </div>
    </Card>
  );
}
