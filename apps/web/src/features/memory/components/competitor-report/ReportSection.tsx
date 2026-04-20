import type { ReactNode } from 'react';
import { Card, Icon, SectionTitle } from '@radikal/ui';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ReportSection({ icon, title, subtitle, right, children, className }: Props) {
  return (
    <Card className={`p-5 sm:p-7 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary)/0.15)] to-[hsl(var(--color-secondary)/0.15)] grid place-items-center text-[hsl(var(--color-primary))] shrink-0">
            <Icon name={icon} className="text-[20px]" />
          </div>
          <div className="min-w-0">
            <SectionTitle className="text-slate-500 mb-1">{title}</SectionTitle>
            {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}
