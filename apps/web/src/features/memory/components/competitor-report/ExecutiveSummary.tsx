import { Button, Icon } from '@radikal/ui';
import type { Competitor } from '../../api/memory';
import { NarrativeSkeleton } from './NarrativeSkeleton';
import { ReportSection } from './ReportSection';

interface Props {
  competitor: Competitor;
  onRegenerate: () => void;
  regenerating: boolean;
}

function renderParagraphs(text: string) {
  return text
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p, i) => (
      <p key={i} className="text-base text-slate-700 leading-relaxed">
        {p}
      </p>
    ));
}

export function ExecutiveSummary({ competitor, onRegenerate, regenerating }: Props) {
  const narrative = competitor.narrative;
  const isStale = competitor.narrative_stale ?? false;
  const isLoading = !narrative && !!competitor.last_analyzed_at;

  const staleChip = isStale ? (
    <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-4">
      <Icon name="info" className="text-[14px]" />
      Interpretación anterior al último análisis — regenera para actualizarla.
    </div>
  ) : null;

  return (
    <ReportSection
      icon="auto_stories"
      title="Resumen ejecutivo"
      subtitle="Qué es esta marca, qué hace bien, dónde es vulnerable"
      right={
        narrative && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={regenerating}
          >
            <Icon
              name="refresh"
              className={`text-[16px] ${regenerating ? 'animate-spin' : ''}`}
            />
            Regenerar
          </Button>
        )
      }
    >
      {staleChip}
      {isLoading ? (
        <NarrativeSkeleton paragraphs={3} />
      ) : narrative ? (
        <div className="space-y-4">{renderParagraphs(narrative.summary)}</div>
      ) : (
        <p className="text-sm text-slate-500">
          Analiza a este competidor para generar la interpretación.
        </p>
      )}
    </ReportSection>
  );
}
