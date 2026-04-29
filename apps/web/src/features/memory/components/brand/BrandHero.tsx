import {
  Badge,
  Button,
  Card,
  Icon,
} from '@radikal/ui';
import type { Project } from '@/providers/ProjectProvider';
import { LogoBlock } from './LogoBlock';
import { AnalyzeBrandButton } from './AnalyzeBrandButton';
import type { ContentAssetLite } from './utils';

export function BrandHero({
  projectId,
  project,
  companyName,
  logo,
  logoCandidates,
  palette,
  onEdit,
}: {
  projectId: string;
  project: Project | undefined;
  companyName: string;
  logo: ContentAssetLite | null;
  logoCandidates?: ContentAssetLite[];
  palette: string[];
  onEdit: () => void;
}) {
  return (
    <Card className="relative overflow-hidden p-4 sm:p-8 md:p-10 bg-gradient-to-br from-pink-50 via-white to-cyan-50 border-white">
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            palette[0] && palette[1]
              ? `radial-gradient(circle, ${palette[0]}, ${palette[1]})`
              : 'radial-gradient(circle, hsl(var(--color-primary)), hsl(var(--color-secondary)))',
        }}
      />
      <div className="relative flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-8">
        <LogoBlock logo={logo} candidates={logoCandidates} companyName={companyName} projectId={projectId} />

        <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[hsl(var(--color-primary))]">
            Identidad de Marca
          </p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black leading-tight break-words">
            {companyName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
            {project?.industry && <Badge variant="primary">{project.industry}</Badge>}
            {project?.industry_custom && (
              <Badge variant="secondary">{project.industry_custom}</Badge>
            )}
            {project?.website_url && (
              <a
                href={project.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[hsl(var(--color-primary))] hover:underline font-medium"
              >
                <Icon name="language" className="text-[16px]" />
                {project.website_url.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center md:justify-start pt-2">
            <AnalyzeBrandButton projectId={projectId} />
            <Button variant="outline" onClick={onEdit}>
              <Icon name="edit" className="text-[18px]" />
              Editar manualmente
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
