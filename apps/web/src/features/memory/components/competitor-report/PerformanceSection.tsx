import { Card, Icon } from '@radikal/ui';
import { CompetitionCharts } from '../CompetitionCharts';
import type { CompetitorStats } from '../../api/memory';
import { ReportSection } from './ReportSection';

interface Props {
  projectId: string;
  competitorId: string;
  stats: CompetitorStats | undefined;
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (v >= 1000) return v.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  return v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function KpiCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Icon name={icon} className="text-[24px] text-[hsl(var(--color-primary))] shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export function PerformanceSection({ projectId, competitorId, stats }: Props) {
  const eng = stats?.engagement_stats ?? null;
  const bestHour =
    eng?.best_hour !== null && eng?.best_hour !== undefined
      ? `${String(eng.best_hour).padStart(2, '0')}:00`
      : null;

  return (
    <ReportSection
      icon="insights"
      title="Rendimiento social"
      subtitle="Actividad, engagement y mejor ventana de publicación"
    >
      {!eng || eng.total_posts === 0 ? (
        <p className="text-sm text-slate-500">
          Sin datos de redes aún. Toca "Actualizar posts" en la sección anterior.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon="photo_library" label="Posts totales" value={fmt(eng.total_posts)} />
            <KpiCard icon="bolt" label="Engagement prom." value={fmt(eng.avg_engagement)} />
            <KpiCard
              icon="calendar_month"
              label="Posts/semana"
              value={fmt(eng.posts_per_week)}
            />
            <KpiCard
              icon="event_available"
              label="Mejor ventana"
              value={eng.best_day ?? '—'}
              sub={bestHour ? `a las ${bestHour}` : undefined}
            />
          </div>
          <CompetitionCharts projectId={projectId} competitorIds={[competitorId]} />
        </div>
      )}
    </ReportSection>
  );
}
