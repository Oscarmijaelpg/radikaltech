import { Icon } from '@radikal/ui';
import type { Competitor } from '../../api/memory';
import { NarrativeSkeleton } from './NarrativeSkeleton';
import { ReportSection } from './ReportSection';

interface Props {
  competitor: Competitor;
}

function parseBullets(text: string): string[] {
  return text
    .split(/\n/)
    .map((l) => l.replace(/^[\s\-*•·\d\.\)]+/, '').trim())
    .filter((l) => l.length > 0);
}

export function OpportunitySection({ competitor }: Props) {
  const narrative = competitor.narrative?.opportunity;
  const isLoading = !competitor.narrative && !!competitor.last_analyzed_at;

  return (
    <ReportSection
      icon="rocket_launch"
      title="Tu oportunidad"
      subtitle="Qué puedes hacer frente a este competidor, específico para tu marca"
      className="bg-gradient-to-br from-violet-50/50 to-pink-50/50 border-violet-100"
    >
      {isLoading ? (
        <NarrativeSkeleton paragraphs={2} />
      ) : narrative ? (
        <ul className="space-y-3">
          {parseBullets(narrative).map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-base text-slate-800">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-black shrink-0 mt-0.5 shadow">
                {i + 1}
              </span>
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Icon name="hourglass_empty" className="text-[18px]" />
          Analiza a este competidor para ver oportunidades específicas.
        </div>
      )}
    </ReportSection>
  );
}
