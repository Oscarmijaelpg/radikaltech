import { Card } from '@radikal/ui';
import type { Project } from '@/providers/ProjectProvider';
import { SectionTitle } from './shared';

export function BusinessSummarySection({ project }: { project: Project | undefined }) {
  if (!project?.business_summary) return null;
  return (
    <Card className="p-4 sm:p-6 md:p-8 bg-white border-white">
      <SectionTitle icon="business">Sobre el negocio</SectionTitle>
      <p className="text-sm md:text-base text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
        {project.business_summary}
      </p>
      {project.additional_context && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Contexto adicional
          </p>
          <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
            {project.additional_context}
          </p>
        </div>
      )}
    </Card>
  );
}
