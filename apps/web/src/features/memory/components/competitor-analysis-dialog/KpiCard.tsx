import { Card, Icon, SectionTitle } from '@radikal/ui';

interface Props {
  icon: string;
  label: string;
  value: string;
}

export function KpiCard({ icon, label, value }: Props) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon name={icon} className="text-[28px] text-[hsl(var(--color-primary))]" aria-hidden />
        <div className="min-w-0">
          <SectionTitle className="text-slate-400">{label}</SectionTitle>
          <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}
