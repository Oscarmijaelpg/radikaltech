import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Spinner,
} from '@radikal/ui';
import { Trash2, ExternalLink, RefreshCw, Globe, Users2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminProject, useDeleteProject, useReanalyzeProject, type ReanalyzeKind } from '../api/projects';
import { ConfirmDeleteDialog } from '@/features/users/components/ConfirmDeleteDialog';
import { useToast } from '@/shared/ui/Toaster';
import { ProjectBadge } from '@/shared/ui/ProjectBadge';

interface Props {
  projectId: string | null;
  onClose: () => void;
}

export function ProjectDetailDrawer({ projectId, onClose }: Props) {
  const { data: project, isLoading } = useAdminProject(projectId);
  const deleteProject = useDeleteProject();
  const reanalyze = useReanalyzeProject();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();

  const onReanalyze = async (kind: ReanalyzeKind) => {
    if (!projectId) return;
    try {
      await reanalyze.mutateAsync({ id: projectId, kind });
      toast({
        variant: 'success',
        title: 'Análisis disparado',
        description: `La tarea ${kind} se ejecutará en segundo plano.`,
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'No se pudo re-disparar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <>
      <Dialog open={!!projectId} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          {isLoading || !project ? (
            <div className="py-12 grid place-items-center"><Spinner /></div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <ProjectBadge
                  logoUrl={project.logoUrl}
                  label={project.companyName ?? project.name}
                  size={64}
                  className="rounded-2xl"
                />
                <div className="flex-1 min-w-0">
                  <DialogTitle className="truncate">{project.name}</DialogTitle>
                  <DialogDescription>
                    {project.companyName ?? '—'} · {project.industry ?? 'sin industria'}
                  </DialogDescription>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Info label="Propietario" value={`${project.user.email}`} />
                <Info label="Alta" value={format(new Date(project.createdAt), 'dd MMM yyyy HH:mm')} />
                <Info label="ID" value={<code className="text-xs break-all">{project.id}</code>} />
                <Info
                  label="Sitio web"
                  value={
                    project.websiteUrl ? (
                      <a
                        href={project.websiteUrl}
                        target="_blank"
                        rel="noopener"
                        className="text-primary underline inline-flex items-center gap-1 break-all"
                      >
                        {project.websiteUrl}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <MetricBox label="Chats" value={project._count.chats} />
                <MetricBox label="Contenido" value={project._count.contentAssets} />
                <MetricBox label="Reportes" value={project._count.reports} />
                <MetricBox label="Memorias" value={project._count.memories} />
                <MetricBox label="Tareas" value={project._count.aiJobs} />
                <MetricBox label="Competidores" value={project.competitors.length} />
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="text-xs uppercase tracking-wider text-slate-500">Re-ejecutar análisis</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReanalyze('website')}
                    disabled={reanalyze.isPending || !project.websiteUrl}
                  >
                    <Globe size={14} />
                    Sitio web
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReanalyze('competitors')}
                    disabled={reanalyze.isPending}
                  >
                    <Users2 size={14} />
                    Competidores
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReanalyze('brand')}
                    disabled={reanalyze.isPending}
                  >
                    <Sparkles size={14} />
                    Marca
                  </Button>
                  {reanalyze.isPending && <RefreshCw size={14} className="animate-spin text-slate-400" />}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} className="mr-2" />
                  Eliminar proyecto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar proyecto"
        description={`Esta acción elimina el proyecto "${project?.name ?? ''}" y todos sus datos (marca, competidores, reportes, memorias). No se puede deshacer.`}
        confirmText={project?.name ?? ''}
        loading={deleteProject.isPending}
        onConfirm={async () => {
          if (!projectId) return;
          await deleteProject.mutateAsync(projectId);
          setConfirmDelete(false);
          onClose();
        }}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
    </div>
  );
}
