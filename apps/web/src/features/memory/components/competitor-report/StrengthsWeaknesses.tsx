import { Icon, SectionTitle } from '@radikal/ui';
import type { Competitor } from '../../api/memory';
import { ReportSection } from './ReportSection';

interface Props {
  competitor: Competitor;
}

export function StrengthsWeaknesses({ competitor }: Props) {
  const analysis = competitor.analysis_data;
  const competitors = analysis?.competitors ?? [];
  const strengths = competitors.flatMap((c) => c.strengths ?? []);
  const weaknesses = competitors.flatMap((c) => c.weaknesses ?? []);
  const insights = analysis?.insights ?? [];

  if (strengths.length === 0 && weaknesses.length === 0 && insights.length === 0) {
    return null;
  }

  return (
    <ReportSection
      icon="balance"
      title="Fortalezas, debilidades e insights"
      subtitle="Lo que encontramos en su presencia pública"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {strengths.length > 0 && (
          <div>
            <SectionTitle className="text-emerald-600 mb-3 flex items-center gap-2">
              <Icon name="trending_up" className="text-[16px]" />
              Fortalezas
            </SectionTitle>
            <ul className="space-y-2">
              {strengths.slice(0, 8).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <Icon name="check_circle" className="text-[16px] text-emerald-500 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {weaknesses.length > 0 && (
          <div>
            <SectionTitle className="text-rose-600 mb-3 flex items-center gap-2">
              <Icon name="trending_down" className="text-[16px]" />
              Debilidades
            </SectionTitle>
            <ul className="space-y-2">
              {weaknesses.slice(0, 8).map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <Icon name="cancel" className="text-[16px] text-rose-500 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {insights.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <SectionTitle className="mb-3 flex items-center gap-2">
            <Icon name="lightbulb" className="text-[16px] text-amber-500" />
            Insights estratégicos
          </SectionTitle>
          <ol className="space-y-2">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{ins}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </ReportSection>
  );
}
