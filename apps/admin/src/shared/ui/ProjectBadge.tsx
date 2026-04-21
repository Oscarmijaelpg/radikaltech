import { clsx } from 'clsx';
import { useLogoBrightness, logoContainerStyle } from '@/shared/hooks/useLogoBrightness';

interface Props {
  logoUrl?: string | null;
  label?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name?: string | null) {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ProjectBadge({ logoUrl, label, size = 40, className }: Props) {
  const brightness = useLogoBrightness(logoUrl);
  const sizeStyle = { width: size, height: size };

  if (logoUrl) {
    return (
      <div
        style={{ ...sizeStyle, ...logoContainerStyle(brightness) }}
        className={clsx(
          'rounded-xl border border-slate-200 overflow-hidden shrink-0 grid place-items-center transition-colors',
          className,
        )}
      >
        <img
          src={logoUrl}
          alt={label ?? 'Logo'}
          className="w-full h-full object-contain p-1"
        />
      </div>
    );
  }
  return (
    <div
      style={sizeStyle}
      className={clsx(
        'rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shrink-0 text-xs font-bold',
        className,
      )}
    >
      {getInitials(label)}
    </div>
  );
}
