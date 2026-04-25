import { useState, useMemo } from 'react';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Icon,
  Skeleton,
  Spinner,
} from '@radikal/ui';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useProject } from '@/providers/ProjectProvider';
import {
  useAssets,
  useDeleteAsset,
  useEvaluateAsset,
  type ContentAsset,
} from '../api/content';
import { ImageEditDialog } from './ImageEditDialog';

function scoreBadgeVariant(score: number | null) {
  if (score === null || score === undefined) return 'muted' as const;
  if (score < 5) return 'destructive' as const;
  if (score < 7) return 'warning' as const;
  return 'success' as const;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function GeneratedLibrary() {
  const { activeProject } = useProject();
  const [selected, setSelected] = useState<ContentAsset | null>(null);
  const [editTarget, setEditTarget] = useState<ContentAsset | null>(null);

  const { data: allAssets, isLoading } = useAssets(activeProject?.id, { type: 'image', sort: 'recent' });
  
  // Filtrar solo las generadas por la plataforma
  const assets = useMemo(() => {
    return allAssets?.filter(a => a.tags.includes('generated')) || [];
  }, [allAssets]);

  const deleteAsset = useDeleteAsset();
  const evaluateAsset = useEvaluateAsset();
  const confirmDialog = useConfirm();

  if (!activeProject) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        Selecciona un proyecto para ver tu biblioteca generada.
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-[2rem]" />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <CharacterEmpty
        character="nexo"
        title="Tu biblioteca está vacía"
        message="Aún no has generado imágenes con IA en este proyecto. ¡Prueba en la sección de Ideas de Nexo o en Generar con IA!"
      />
    );
  }

  const onEvaluate = (asset: ContentAsset) => {
    void evaluateAsset.mutate({ id: asset.id, project_id: asset.project_id });
  };

  const onDelete = async (asset: ContentAsset) => {
    const ok = await confirmDialog({ title: '¿Eliminar de la biblioteca?', variant: 'danger', confirmLabel: 'Eliminar' });
    if (!ok) return;
    void deleteAsset.mutate({ id: asset.id, project_id: asset.project_id });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Biblioteca de Imágenes</h3>
        <p className="text-sm text-slate-500">Solo imágenes creadas por la IA de Radikal para este proyecto.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {assets.map((asset) => (
          <Card
            key={asset.id}
            className="overflow-hidden p-0 group cursor-pointer hover:shadow-2xl transition-all rounded-[2rem] border-slate-100"
            onClick={() => setSelected(asset)}
          >
            <div className="relative">
              <img
                src={asset.asset_url}
                alt=""
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              {asset.aesthetic_score !== null && (
                <div className="absolute top-3 left-3">
                  <Badge variant={scoreBadgeVariant(asset.aesthetic_score)} className="shadow-sm">
                    {asset.aesthetic_score.toFixed(1)}
                  </Badge>
                </div>
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white !text-slate-900 border-none flex-1 font-bold rounded-xl"
                    onClick={() => setSelected(asset)}
                  >
                    Detalles
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl"
                    onClick={() => onDelete(asset)}
                  >
                    <Icon name="delete" className="text-[16px]" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate mb-2">
                {asset.ai_description || 'Imagen generada'}
               </p>
               <div className="flex gap-1 flex-wrap">
                  {asset.tags.filter(t => t !== 'generated').slice(0, 2).map(t => (
                    <Badge key={t} variant="muted" className="text-[9px] uppercase tracking-tighter">{t}</Badge>
                  ))}
               </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl rounded-[2.5rem]">
          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-xl">
                  <img
                    src={selected.asset_url}
                    alt=""
                    className="w-full aspect-square object-cover"
                  />
                </div>
                <div className="flex gap-2">
                   <Button className="flex-1 rounded-xl" asChild>
                      <a href={selected.asset_url} target="_blank" rel="noreferrer">Descargar Original</a>
                   </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Generada el</h4>
                  <p className="text-sm font-bold text-slate-900">{formatDate(selected.created_at)}</p>
                </div>

                {selected.marketing_feedback && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Análisis de Marca</h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl">
                      {selected.marketing_feedback}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Prompt Utilizado</h4>
                  <p className="text-xs text-slate-500 italic">"{selected.ai_description}"</p>
                </div>

                <div className="flex gap-2 pt-4">
                   <Button variant="outline" className="rounded-xl flex-1" onClick={() => setEditTarget(selected)}>
                      <Icon name="auto_fix_high" className="mr-2" />
                      Refinar
                   </Button>
                   <Button variant="destructive" className="rounded-xl" onClick={() => { onDelete(selected); setSelected(null); }}>
                      <Icon name="delete" />
                   </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editTarget && (
        <ImageEditDialog
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          sourceUrl={editTarget.asset_url}
          sourceAssetId={editTarget.id}
          projectId={editTarget.project_id}
        />
      )}
    </div>
  );
}
