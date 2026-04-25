import { clsx } from 'clsx';

interface Props {
  avatarUrl?: string | null;
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

export function UserAvatar({ avatarUrl, label, size = 40, className }: Props) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.35)) };
  if (avatarUrl) {
    return (
      <div
        style={style}
        className={clsx(
          'rounded-xl bg-slate-100 overflow-hidden grid place-items-center shrink-0',
          className,
        )}
      >
        <img src={avatarUrl} alt={label ?? ''} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      style={style}
      className={clsx(
        'rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shrink-0 font-bold',
        className,
      )}
    >
      {getInitials(label)}
    </div>
  );
}
