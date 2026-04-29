import { useProject } from '@/providers/ProjectProvider';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';

export function ReportLogo({ projectId }: { projectId: string }) {
  const { activeProject } = useProject();
  const isActive = !!(activeProject && activeProject.id === projectId);
  const { url: logo, brightness } = useProjectLogoWithBrightness(isActive ? projectId : null);
  if (!logo) return null;
  return (
    <div
      className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-slate-200 overflow-hidden grid place-items-center shrink-0"
      style={logoContainerStyle(brightness)}
    >
      <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
    </div>
  );
}
