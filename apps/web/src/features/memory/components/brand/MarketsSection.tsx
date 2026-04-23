import { useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Spinner,
  Textarea,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useDetectMarkets, useUpdateMarkets } from '../../api/memory';
import { SectionTitle, BulletList, ExpandableContent } from './shared';

export function MarketsSection({ projectId }: { projectId: string }) {
  const { activeProject } = useProject();
  const detect = useDetectMarkets(projectId);
  const updateMarkets = useUpdateMarkets(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState('');

  if (!activeProject) return null;
  const confirmed = activeProject.operating_countries ?? [];

  const openDialog = () => {
    setDraft(confirmed.join('\n'));
    setDialogOpen(true);
  };

  const save = async () => {
    const lines = draft.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    await updateMarkets.mutateAsync(lines);
    setDialogOpen(false);
  };

  return (
    <Card className="p-4 sm:p-6 md:p-8 bg-white border-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
        <SectionTitle icon="public">Mercados donde operas</SectionTitle>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => detect.mutate()}
            disabled={detect.isPending}
          >
            {detect.isPending ? <Spinner /> : 'Detectar con IA'}
          </Button>
          <Button size="sm" variant="outline" onClick={openDialog}>
            Editar mercados
          </Button>
        </div>
      </div>

      {confirmed.length > 0 ? (
        <ExpandableContent title="Mercados donde operas" icon="public" maxHeight="max-h-[120px]">
          <BulletList text={confirmed.join('\n')} />
        </ExpandableContent>
      ) : (
        <p className="text-xs italic text-slate-400">Aún no se han detectado mercados</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar mercados</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-500 font-medium">
              Escribe cada ubicación en una línea nueva. Puedes incluir países, ciudades o zonas específicas.
            </p>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ejemplo:&#10;Colombia&#10;Medellín&#10;Barrio El Poblado"
              className="min-h-[200px] font-medium leading-relaxed"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={updateMarkets.isPending}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
