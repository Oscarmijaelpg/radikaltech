import { Badge } from '@radikal/ui';
import type { Competitor, SocialPostItem } from '../../api/memory';
import { useAesthetic } from './useAesthetic';
import { NarrativeSkeleton } from './NarrativeSkeleton';
import { ReportSection } from './ReportSection';

interface Props {
  competitor: Competitor;
  posts: SocialPostItem[] | undefined;
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

export function AestheticSection({ competitor, posts }: Props) {
  const agg = useAesthetic(posts);
  const narrative = competitor.narrative?.aesthetic;
  const isLoading = !competitor.narrative && !!competitor.last_analyzed_at;

  return (
    <ReportSection
      icon="palette"
      title="Estética visual"
      subtitle="Identidad visual inferida de sus últimos posts"
    >
      {isLoading ? (
        <NarrativeSkeleton paragraphs={2} />
      ) : narrative ? (
        <div className="space-y-4 mb-6">{renderParagraphs(narrative)}</div>
      ) : null}

      {agg ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">
              Colores dominantes
            </p>
            <div className="flex flex-wrap gap-2">
              {agg.topColors.map((c, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span
                    className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                  <span className="text-[9px] font-mono text-slate-400">{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">
              Estilos frecuentes
            </p>
            <div className="flex flex-wrap gap-2">
              {agg.topTags.map(({ tag, count }, i) => (
                <Badge key={i} variant="secondary">
                  {tag} · {count}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ) : !narrative && !isLoading ? (
        <p className="text-sm text-slate-500">
          Sin análisis visual aún. Se generará al sincronizar posts con imágenes.
        </p>
      ) : null}
    </ReportSection>
  );
}
