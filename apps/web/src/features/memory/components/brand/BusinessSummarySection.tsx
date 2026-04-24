import { Card, SectionTitle as SectionLabel } from '@radikal/ui';
import type { Project } from '@/providers/ProjectProvider';
import { SectionTitle, ExpandableContent } from './shared';

export function BusinessSummarySection({ project }: { project: Project | undefined }) {
  if (!project?.business_summary) return null;
  return (
    <Card className="p-4 sm:p-6 md:p-8 bg-white border-white">
      <SectionTitle icon="business">Sobre el negocio</SectionTitle>
      <ExpandableContent title="Sobre el negocio" icon="business" maxHeight="max-h-[150px]">
        <p className="text-sm md:text-base text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
          {project.business_summary}
        </p>
      </ExpandableContent>
      {project.additional_context && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <SectionLabel className="mb-3">
            Contexto adicional
          </SectionLabel>
          <ExpandableContent title="Contexto adicional" maxHeight="max-h-[100px]">
            <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
              {project.additional_context}
            </p>
          </ExpandableContent>
        </div>
      )}
    </Card>
  );
}
