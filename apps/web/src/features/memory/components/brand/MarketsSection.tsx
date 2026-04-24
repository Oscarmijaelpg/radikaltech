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
import { SectionTitle, ExpandableContent } from './shared';

export function MarketsSection({ projectId }: { projectId: string }) {
  const { activeProject } = useProject();
  const detect = useDetectMarkets(projectId);
  const updateMarkets = useUpdateMarkets(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState('');

  if (!activeProject) return null;

  // Soporta tanto string (nuevo formato narrativo) como array (formato legacy)
  const rawMarkets = activeProject.operating_countries;
  const marketText: string = Array.isArray(rawMarkets)
    ? rawMarkets.join(', ')
    : (rawMarkets as string | null | undefined) ?? '';

  const openDialog = () => {
    setDraft(marketText);
    setDialogOpen(true);
  };

  const save = async () => {
    // Enviamos como array de un solo elemento para mantener compatibilidad con la API
    await updateMarkets.mutateAsync([draft]);
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
            <p className="text-sm text-slate-500">
              Describe en qué países, ciudades, barrios o zonas opera tu marca. 
              Puedes escribirlo como un párrafo o una lista.
            </p>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ejemplo: La marca opera principalmente en Colombia, con fuerte presencia en Bogotá en los barrios de Chapinero y Usaquén..."
              className="min-h-[200px] font-medium leading-relaxed"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={updateMarkets.isPending}>
              {updateMarkets.isPending ? <Spinner /> : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
