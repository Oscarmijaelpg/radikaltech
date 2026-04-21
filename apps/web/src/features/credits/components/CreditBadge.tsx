import { NavLink } from 'react-router-dom';
import { Icon } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { useCreditBalance } from '../api/credits';

interface Props {
  className?: string;
  compact?: boolean;
}

function format(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return new Intl.NumberFormat('es-MX').format(n);
}

export function CreditBadge({ className, compact = false }: Props) {
  const { data, isLoading } = useCreditBalance();
  const balance = data?.balance ?? 0;
  const low = !isLoading && balance <= 20;

  return (
    <NavLink
      to="/settings/credits"
      aria-label={`Saldo: ${balance} monedas`}
      className={cn(
        'inline-flex items-center gap-1.5 h-9 px-3 rounded-2xl border transition-all',
        'bg-gradient-to-br from-amber-50 to-amber-100/50',
        'border-amber-200 hover:border-amber-300 hover:shadow-md',
        low && 'from-red-50 to-red-100/50 border-red-200',
        className,
      )}
    >
      <Icon
        name="paid"
        className={cn(
          'text-[18px]',
          low ? 'text-red-600' : 'text-amber-600',
        )}
      />
      {!compact && (
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            low ? 'text-red-700' : 'text-amber-900',
          )}
        >
          {isLoading ? '—' : format(balance)}
        </span>
      )}
    </NavLink>
  );
}
