import { Badge, SectionTitle } from '@radikal/ui';
import type { CompetitorAnalysisResult } from '../../api/memory';

interface Props {
  result: CompetitorAnalysisResult | null;
}

export function AnalysisTab({ result }: Props) {
  if (!result) {
    return <p className="text-sm text-slate-500">Aún no hay análisis de mercado.</p>;
  }
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle as="h3" className="mb-2">
          Consulta usada
        </SectionTitle>
        <p className="text-sm text-slate-700">{result.query}</p>
      </section>

      <section>
        <SectionTitle as="h3" className="mb-3">
          Competidores detectados por Sira
        </SectionTitle>
        {result.competitors.length === 0 ? (
          <p className="text-sm text-slate-500">No se encontraron competidores.</p>
        ) : (
          <div className="space-y-3">
            {result.competitors.map((c, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-slate-900">{c.name}</h4>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[hsl(var(--color-primary))] hover:underline truncate max-w-[40%]"
                    >
                      {c.url}
                    </a>
                  )}
                </div>
                {c.summary && <p className="text-sm text-slate-600 mb-3">{c.summary}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {c.strengths && c.strengths.length > 0 && (
                    <div>
                      <SectionTitle className="text-emerald-600 mb-1">Fortalezas</SectionTitle>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                        {c.strengths.map((s, j) => (
                          <li key={j}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.weaknesses && c.weaknesses.length > 0 && (
                    <div>
                      <SectionTitle className="text-red-500 mb-1">Debilidades</SectionTitle>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                        {c.weaknesses.map((s, j) => (
                          <li key={j}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle as="h3" className="mb-2">
          Insights estratégicos
        </SectionTitle>
        {result.insights.length === 0 ? (
          <p className="text-sm text-slate-500">Sin insights.</p>
        ) : (
          <ul className="space-y-2">
            {result.insights.map((ins, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <Badge variant="primary">{i + 1}</Badge>
                <span className="flex-1">{ins}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
