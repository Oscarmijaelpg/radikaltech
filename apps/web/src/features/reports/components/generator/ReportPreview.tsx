import { Icon } from '@radikal/ui';
import { CHARACTERS } from '@/shared/characters';
import type { ReportModeMeta } from './report-modes';

interface Props {
  meta: ReportModeMeta;
}

export function ReportPreview({ meta }: Props) {
  const kronos = CHARACTERS.kronos;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${kronos.accent} p-[2px] shrink-0`}>
          <div className="w-full h-full rounded-[14px] bg-white overflow-hidden">
            <img src={kronos.image} alt={kronos.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Kronos se encarga</p>
          <p className="text-xs text-slate-500">{meta.description}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
          Qué incluye
        </p>
        <ul className="space-y-2">
          {meta.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black grid place-items-center shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 pt-0.5">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
        <Icon name="schedule" className="text-[16px]" />
        Tiempo aproximado: ~{meta.estimatedSeconds}s
      </div>
    </div>
  );
}
