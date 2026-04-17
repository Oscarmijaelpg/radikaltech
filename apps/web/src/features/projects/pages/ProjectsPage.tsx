import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { NewProjectDialog } from '../components/NewProjectDialog';

function getInitials(name?: string | null) {
  if (!name) return '??';
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function ProjectCard({ project, onSelect, isActive }: { project: { id: string; name: string; company_name?: string | null; industry?: string | null; is_default?: boolean }; onSelect: () => void; isActive: boolean }) {
  const { url: logo, brightness } = useProjectLogoWithBrightness(project.id);
  const label = project.company_name ?? project.name;

  return (
    <Card className={`p-6 hover:scale-[1.02] transition-transform cursor-pointer relative ${isActive ? 'ring-2 ring-[hsl(var(--color-primary))] border-[hsl(var(--color-primary))]' : ''}`} onClick={onSelect}>
      {logo ? (
        <div
          className="w-14 h-14 rounded-2xl border border-slate-200 overflow-hidden shadow-sm mb-4 grid place-items-center"
          style={logoContainerStyle(brightness)}
        >
          <img src={logo} alt={label} className="w-full h-full object-contain p-1" />
        </div>
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white font-display font-bold shadow-lg mb-4">
          {getInitials(label)}
        </div>
      )}
      <h3 className="font-display font-bold text-xl text-slate-900 truncate">
        {label}
      </h3>
      <p className="text-[10px] font-black uppercase tracking-tighter opacity-50 mt-2">
        {project.industry ?? 'Sin industria'}
      </p>
      {isActive && (
        <span className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-[10px] font-black uppercase tracking-widest border border-[hsl(var(--color-primary)/0.3)]">
          <span className="material-symbols-outlined text-[12px]">check_circle</span>
          Activo
        </span>
      )}
      {project.is_default && !isActive && (
        <span className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200">
          <span className="material-symbols-outlined text-[12px]">star</span>
          Por defecto
        </span>
      )}
    </Card>
  );
}

export function ProjectsPage() {
  const { projects, setActiveProject, activeProject } = useProject();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelect = (p: typeof projects[number]) => {
    setActiveProject(p);
    navigate('/');
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <header className="mb-6 sm:mb-8 md:mb-10 relative overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-6 md:p-10 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">
                Tus marcas
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight">
                Proyectos
              </h1>
              <p className="text-white/80 mt-3 text-base md:text-lg">
                Cada proyecto es un universo de marca independiente.
              </p>
            </div>
            <Button
              variant="outline"
              className="bg-white !text-slate-900 border-white hover:bg-white/90 min-h-[44px]"
              onClick={() => setDialogOpen(true)}
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nuevo proyecto
            </Button>
          </div>
        </header>

        {projects.length === 0 ? (
          <Card className="p-6 md:p-12">
            <CharacterEmpty
              character="ankor"
              title="Cada marca empieza aquí"
              message="Creemos la primera. Un nombre, una industria, y abrimos un nuevo universo de marca donde guardamos toda tu estrategia."
              action={{ label: 'Nuevo proyecto', onClick: () => setDialogOpen(true) }}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onSelect={() => handleSelect(p)} isActive={activeProject?.id === p.id} />
            ))}
          </div>
        )}
      </div>
      <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
