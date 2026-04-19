import type { CompetitorStats } from '../../api/memory';
import { CompetitionCharts } from '../CompetitionCharts';
import { KpiCard } from './KpiCard';
import { NoSocialDataEmpty } from './NoSocialDataEmpty';
import { fmtNumber } from './format';

interface Props {
  projectId: string;
  competitorId: string;
  competitorName: string;
  stats: CompetitorStats | undefined;
}

export function ChartsTab({ projectId, competitorId, competitorName, stats }: Props) {
  const engagement = stats?.engagement_stats ?? null;
  const bestHourLabel =
    engagement?.best_hour !== null && engagement?.best_hour !== undefined
      ? `${String(engagement.best_hour).padStart(2, '0')}:00`
      : null;

  if (!engagement || engagement.total_posts === 0) {
    return <NoSocialDataEmpty competitorName={competitorName} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon="photo_library" label="Total posts" value={fmtNumber(engagement.total_posts)} />
        <KpiCard icon="bolt" label="Engagement prom." value={fmtNumber(engagement.avg_engagement)} />
        <KpiCard
          icon="calendar_month"
          label="Posts/semana"
          value={fmtNumber(engagement.posts_per_week)}
        />
        <KpiCard
          icon="event_available"
          label="Mejor día"
          value={
            engagement.best_day
              ? `${engagement.best_day}${bestHourLabel ? ` · ${bestHourLabel}` : ''}`
              : '—'
          }
        />
      </div>
      <CompetitionCharts projectId={projectId} competitorIds={[competitorId]} />
    </div>
  );
}
