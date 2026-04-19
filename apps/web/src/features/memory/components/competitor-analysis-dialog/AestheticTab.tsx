import { Badge, SectionTitle } from '@radikal/ui';
import type { AestheticAggregation } from './useAesthetic';

interface Props {
  aesthetic: AestheticAggregation | null;
  competitorName: string;
}

export function AestheticTab({ aesthetic, competitorName }: Props) {
  if (!aesthetic) {
    return (
      <p className="text-sm text-slate-500">
        Aún no hay análisis visual. Ejecuta un scrape para generar estética visual automática.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          La estética de {competitorName}
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Basado en {aesthetic.total} posts analizados automáticamente.
        </p>
        {aesthetic.descriptions.length > 0 && (
          <ul className="space-y-2">
            {aesthetic.descriptions.map((d, i) => (
              <li
                key={i}
                className="text-sm text-slate-700 border-l-2 border-slate-200 pl-3"
              >
                {d}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle as="h3" className="mb-2">
          Colores dominantes
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          {aesthetic.topColors.map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className="w-12 h-12 rounded-xl border border-slate-300"
                style={{ backgroundColor: c }}
                title={c}
              />
              <span className="text-[10px] font-mono text-slate-500">{c}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle as="h3" className="mb-2">
          Style tags frecuentes
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          {aesthetic.topTags.map(({ tag, count }, i) => (
            <Badge key={i} variant="secondary">
              {tag} · {count}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
