import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={
        className ??
        'flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400'
      }
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const content = (
            <span
              className={
                isLast
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'hover:text-[hsl(var(--color-primary))] transition-colors'
              }
            >
              {item.label}
            </span>
          );
          return (
            <li key={i} className="flex items-center gap-1">
              {!isLast && item.to ? (
                <Link to={item.to} className="inline-flex items-center">
                  {content}
                </Link>
              ) : !isLast && item.onClick ? (
                <button type="button" onClick={item.onClick} className="inline-flex items-center">
                  {content}
                </button>
              ) : (
                content
              )}
              {!isLast && (
                <span className="material-symbols-outlined text-[14px] opacity-50">
                  chevron_right
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
