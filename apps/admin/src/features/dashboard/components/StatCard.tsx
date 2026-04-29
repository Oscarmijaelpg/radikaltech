import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
}

const TONES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-white',
  positive: 'bg-emerald-50',
  negative: 'bg-red-50',
  warning: 'bg-amber-50',
};

const ICON_TONES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }: Props) {
  return (
    <div className={clsx('rounded-3xl border border-slate-200 p-5 flex flex-col gap-3', TONES[tone])}>
      <div className="flex items-start justify-between">
        <div className="text-sm text-slate-500">{label}</div>
        <div className={clsx('rounded-xl p-2', ICON_TONES[tone])}>
          <Icon size={18} />
        </div>
      </div>
      <div className="font-display text-3xl font-bold">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
