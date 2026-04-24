import { Card } from '@radikal/ui';
import type { Project } from '@/providers/ProjectProvider';
import type { BrandProfile } from '../../api/memory';
import { BulletList, SectionTitle, ExpandableContent } from './shared';

export function BrandBusinessSection({
  project,
  brand,
}: {
  project: Project | undefined;
  brand: BrandProfile | null | undefined;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 bg-white">
        <SectionTitle icon="inventory_2">Productos y servicios</SectionTitle>
        {project?.main_products ? (
          <BulletList text={project.main_products} />
        ) : (
          <p className="text-xs italic text-slate-400">
            Sin productos registrados
          </p>
        )}
      </Card>

      <Card className="p-4 sm:p-6 bg-gradient-to-br from-cyan-50 to-pink-50 border-white">
        <SectionTitle icon="star">Propuesta única de valor</SectionTitle>
        {project?.unique_value ? (
          <ExpandableContent title="Propuesta única de valor" icon="star" maxHeight="max-h-[100px]">
            <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
              {project.unique_value}
            </p>
          </ExpandableContent>
        ) : (
          <p className="text-xs italic text-slate-400">
            Aún no has definido tu propuesta de valor
          </p>
        )}
      </Card>

      <Card className="p-4 sm:p-6 bg-white">
        <SectionTitle icon="person">Cliente ideal</SectionTitle>
        {project?.ideal_customer ? (
          <ExpandableContent title="Cliente ideal" icon="person" maxHeight="max-h-[100px]">
            <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
              {project.ideal_customer}
            </p>
          </ExpandableContent>
        ) : (
          <p className="text-xs italic text-slate-400">
            Aún no has definido tu cliente ideal
          </p>
        )}
      </Card>

      <Card className="p-4 sm:p-6 bg-gradient-to-br from-pink-50 to-cyan-50 border-white">
        <SectionTitle icon="military_tech">Ventaja competitiva</SectionTitle>
        {brand?.competitive_advantage ? (
          <ExpandableContent title="Ventaja competitiva" icon="military_tech" maxHeight="max-h-[100px]">
            <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
              {brand.competitive_advantage}
            </p>
          </ExpandableContent>
        ) : (
          <p className="text-xs italic text-slate-400">
            Sin ventaja competitiva registrada
          </p>
        )}
      </Card>
    </div>
  );
}
