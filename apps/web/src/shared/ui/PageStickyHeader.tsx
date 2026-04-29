import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface PageStickyHeaderProps {
  children: ReactNode;
  className?: string;
  /**
   * Reserva espacio a la derecha en lg+ para no tapar la barra flotante
   * del AppShell (CreditBadge + NotificationsBell). Default: true.
   */
  reserveTopbarSpace?: boolean;
}

export function PageStickyHeader({
  children,
  className,
  reserveTopbarSpace = true,
}: PageStickyHeaderProps) {
  return (
    <div
      className={cn(
        '-mx-6 md:-mx-8',
        'sticky z-10',
        'top-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:top-0',
        'bg-[hsl(var(--color-bg))]/80 backdrop-blur-xl',
        'border-b border-[hsl(var(--color-border))]',
        'px-6 md:px-8 pt-2 pb-3 mb-6',
        className,
      )}
    >
      <div className={cn(reserveTopbarSpace && 'lg:pr-[128px]')}>{children}</div>
    </div>
  );
}
