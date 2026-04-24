import { useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  Textarea,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useDetectMarkets, useUpdateMarkets } from '../../api/memory';
import { SectionTitle, ExpandableContent } from './shared';

export function MarketsSection({ projectId }: { projectId: string }) {
  const { activeProject } = useProject();
  const detect = useDetectMarkets(projectId);
  const updateMarkets = useUpdateMarkets(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState('');

  if (!activeProject) return null;
  const marketText = activeProject.operating_countries ?? '';

  const openDialog = () => {
    setDraft(marketText);
    setDialogOpen(true);
  };

  const save = async () => {
    await updateMarkets.mutateAsync(draft.trim());
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
            Editar
          </Button>
        </div>
      </div>

      {marketText ? (
        <ExpandableContent title="Mercados donde operas" icon="public" maxHeight="max-h-[140px]">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {marketText}
          </p>
        </ExpandableContent>
      ) : (
        <p className="text-xs italic text-slate-400">
          Aún no se han detectado mercados. Haz clic en "Detectar con IA" para analizarlos.
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar análisis de mercados</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-500 font-medium">
              Describe los mercados donde opera la empresa. Puedes usar texto libre: países, regiones, ciudades, zonas específicas o contexto estratégico.
            </p>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ej.: Operamos principalmente en Colombia (Bogotá, Medellín) y norte de México. Estamos explorando expansión a Chile y Perú durante 2026."
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
