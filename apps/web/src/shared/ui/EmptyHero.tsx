import type { ReactNode } from 'react';
import { Icon } from '@radikal/ui';

interface EmptyHeroProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyHero({ icon, title, description, action }: EmptyHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-20 w-20 rounded-3xl bg-slate-100 grid place-items-center mb-5">
        <Icon name={icon} className="text-slate-500" style={{ fontSize: '40px' }} />
      </div>
      <h3 className="font-display text-xl md:text-2xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-md mb-5">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
