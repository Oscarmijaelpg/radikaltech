import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';
import { Icon } from '@radikal/ui';
import { PageStickyHeader } from './PageStickyHeader';

const TABS = [
  { to: '/competitors', label: 'Competencia', icon: 'groups' },
  { to: '/news', label: 'Noticias', icon: 'newspaper' },
  { to: '/reports', label: 'Reportes', icon: 'assignment' },
  { to: '/recommendations', label: 'Sugerencias', icon: 'tips_and_updates', badge: 'IA' },
];

export function AnalysisSubnav() {
  return (
    <PageStickyHeader>
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-[hsl(var(--color-primary))] text-white shadow-md'
                  : 'bg-white text-slate-600 border border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary)/0.4)]',
              )
            }
          >
            <Icon name={t.icon} className="text-[18px]" />
            {t.label}
            {t.badge && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/20">
                {t.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </PageStickyHeader>
  );
}
