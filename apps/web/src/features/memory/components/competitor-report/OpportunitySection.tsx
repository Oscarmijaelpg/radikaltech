import { Icon } from '@radikal/ui';
import type { Competitor } from '../../api/memory';
import { NarrativeSkeleton } from './NarrativeSkeleton';
import { ReportSection } from './ReportSection';

interface Props {
  competitor: Competitor;
  regenerating?: boolean;
}

function parseBullets(text: string): string[] {
  return text
    .split(/\n/)
    .map((l) => l.replace(/^[\s\-*•·\d.)]+/, '').trim())
    .filter((l) => l.length > 0);
}

export function OpportunitySection({ competitor, regenerating }: Props) {
  const narrative = competitor.narrative?.opportunity?.trim() ?? '';
  const isLoading = !!regenerating;
  const hasContent = narrative.length > 0;
  const bullets = hasContent ? parseBullets(narrative) : [];

  if (!hasContent && !isLoading) {
    return null;
  }

  return (
    <ReportSection
      icon="rocket_launch"
      title="Estrategia para ganarles"
      subtitle="Acciones concretas para diferenciarte y superar a este competidor"
      className="bg-gradient-to-br from-violet-50/50 to-pink-50/50 border-violet-100"
    >
      {isLoading ? (
        <NarrativeSkeleton paragraphs={2} />
      ) : (
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-base text-slate-800">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-black shrink-0 mt-0.5 shadow">
                {i + 1}
              </span>
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </ReportSection>
  );
}
