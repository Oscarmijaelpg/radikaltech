import { Badge, Icon } from '@radikal/ui';
import { useCompetitorBenchmark } from '../../api/memory';
import { ReportSection } from './ReportSection';
import { fmtNumber } from './format';

interface Props {
  competitorId: string;
  projectId: string;
}

function fmt(v: number | null | undefined): string {
  return fmtNumber(v ?? 0);
}

function Row({
  label,
  mine,
  theirs,
  higherIsBetter = true,
}: {
  label: string;
  mine: number;
  theirs: number;
  higherIsBetter?: boolean;
}) {
  const ahead = higherIsBetter ? mine > theirs : mine < theirs;
  const behind = higherIsBetter ? mine < theirs : mine > theirs;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-500 min-w-[140px]">{label}</span>
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            ahead ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0">
            Tú
          </span>
          <span className="font-bold text-slate-900">{fmt(mine)}</span>
          {ahead && <Icon name="trending_up" className="text-[14px] text-emerald-600 ml-auto" />}
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            behind ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50 border border-slate-200'
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0">
            Competidor
          </span>
          <span className="font-bold text-slate-900">{fmt(theirs)}</span>
          {behind && <Icon name="trending_up" className="text-[14px] text-rose-600 ml-auto" />}
        </div>
      </div>
    </div>
  );
}

const VERDICT_META: Record<
  'ahead' | 'parity' | 'behind',
  { label: string; className: string }
> = {
  ahead: { label: 'Vas por delante', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  parity: { label: 'Están parejos', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  behind: { label: 'Vas por detrás', className: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export function VsMyBrandSection({ competitorId, projectId }: Props) {
  const { data } = useCompetitorBenchmark(projectId);
  const me = data?.my_brand;
  const them = data?.competitors?.find((c) => c.id === competitorId);

  if (!me || !them) return null;
  if (me.social_posts_count === 0 && them.social_posts_count === 0) return null;

  const verdict = them.my_vs_them.verdict;
  const meta = VERDICT_META[verdict];

  return (
    <ReportSection
      icon="compare_arrows"
      title="Tú vs Este competidor"
      subtitle="Comparativa directa con tu marca"
      right={<Badge className={`border ${meta.className}`}>{meta.label}</Badge>}
    >
      <div className="divide-y divide-slate-100">
        <Row label="Posts totales" mine={me.social_posts_count} theirs={them.social_posts_count} />
        <Row label="Likes promedio" mine={me.avg_likes} theirs={them.avg_likes} />
        <Row label="Comments promedio" mine={me.avg_comments} theirs={them.avg_comments} />
        <Row label="Posts por semana" mine={me.posts_per_week} theirs={them.posts_per_week} />
        <Row label="Engagement score" mine={me.engagement_score} theirs={them.engagement_score} />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
        <div>
          <span className="font-semibold text-slate-500 block mb-0.5">Tu mejor plataforma</span>
          <span className="text-slate-900 font-bold">{me.best_performing_platform ?? '—'}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-500 block mb-0.5">
            Mejor plataforma del competidor
          </span>
          <span className="text-slate-900 font-bold">{them.best_performing_platform ?? '—'}</span>
        </div>
      </div>
    </ReportSection>
  );
}
