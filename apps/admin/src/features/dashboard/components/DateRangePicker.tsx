import { useMemo } from 'react';

export interface Range {
  from: string;
  to: string;
}

interface Props {
  value: Range;
  onChange: (r: Range) => void;
}

const PRESETS: Array<{ label: string; days: number }> = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function daysAgoIso(days: number): Range {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function DateRangePicker({ value, onChange }: Props) {
  const activeDays = useMemo(() => {
    const from = new Date(value.from).getTime();
    const to = new Date(value.to).getTime();
    return Math.round((to - from) / (24 * 60 * 60 * 1000));
  }, [value]);

  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-1">
      {PRESETS.map((p) => (
        <button
          key={p.days}
          type="button"
          onClick={() => onChange(daysAgoIso(p.days))}
          className={
            activeDays === p.days
              ? 'px-3 py-1.5 text-sm rounded-lg bg-primary text-white font-medium'
              : 'px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100'
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function defaultRange(days = 30): Range {
  return daysAgoIso(days);
}
