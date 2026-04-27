import { cn } from '@/shared/utils/cn';
import type { SubTab } from './useCompetitorsTab';

interface Props {
  value: SubTab;
  onChange: (v: SubTab) => void;
}

const OPTIONS: { value: SubTab; label: string }[] = [
  { value: 'list', label: 'Lista' },
  { value: 'benchmark', label: 'Benchmark' },
  { value: 'diagnostic', label: 'Diagnóstico IA' },
];

export function SubTabToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors',
            value === o.value
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
