import { useState } from 'react';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import {
  Card,
  Button,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Spinner,
} from '@radikal/ui';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useProject } from '@/providers/ProjectProvider';
import {
  useAssets,
  useDeleteAsset,
  useEvaluateAsset,
  type AssetType,
  type ContentAsset,
} from '../api/content';
import { ImageEditDialog } from './ImageEditDialog';

interface Filters {
  type?: AssetType;
  sort: 'recent' | 'score';
}

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

function AssetThumb({ asset }: { asset: ContentAsset }) {
  if (asset.asset_type === 'image') {
    return (
      <img
        src={asset.asset_url}
        alt=""
        className="w-full aspect-square object-cover"
        loading="lazy"
      />
    );
  }
  const icon =
    asset.asset_type === 'video'
      ? 'movie'
      : asset.asset_type === 'audio'
        ? 'music_note'
        : 'description';
  return (
    <div className="w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center">
      <span className="material-symbols-outlined text-[48px] text-slate-500">
        {icon}
      </span>
    </div>
  );
}

export function AssetGallery() {
  const { activeProject } = useProject();
  const [filters, setFilters] = useState<Filters>({ sort: 'recent' });
  const [selected, setSelected] = useState<ContentAsset | null>(null);
  const [editTarget, setEditTarget] = useState<ContentAsset | null>(null);

  const { data: assets, isLoading } = useAssets(activeProject?.id, filters);
  const deleteAsset = useDeleteAsset();
  const evaluateAsset = useEvaluateAsset();

  if (!activeProject) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        Selecciona un proyecto para ver sus assets.
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <CharacterEmpty
        character="nexo"
        title="¿Una imagen? ¿Un video?"
        message="¡Vamos, enséñame qué tienes! Sube el primer asset y lo analizo en el acto."
      />
    );
  }

  const onEvaluate = (asset: ContentAsset) => {
    void evaluateAsset.mutate({ id: asset.id, project_id: asset.project_id });
  };

  const confirmDialog = useConfirm();
  const onDelete = async (asset: ContentAsset) => {
    const ok = await confirmDialog({ title: '¿Eliminar este asset?', variant: 'danger', confirmLabel: 'Eliminar' });
    if (!ok) return;
    void deleteAsset.mutate({ id: asset.id, project_id: asset.project_id });
  };

  const suggestions = Array.isArray(
    (selected?.metadata as { suggestions?: unknown } | null)?.suggestions,
  )
    ? ((selected!.metadata as { suggestions: string[] }).suggestions)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={!filters.type ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, type: undefined }))}
          >
            Todos
          </Button>
          {(['image', 'video', 'document', 'audio'] as AssetType[]).map((t) => (
            <Button
              key={t}
              variant={filters.type === t ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, type: t }))}
            >
              {t === 'image'
                ? 'Imágenes'
                : t === 'video'
                  ? 'Videos'
                  : t === 'audio'
                    ? 'Audio'
                    : 'Documentos'}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filters.sort === 'recent' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, sort: 'recent' }))}
          >
            Recientes
          </Button>
          <Button
            variant={filters.sort === 'score' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, sort: 'score' }))}
          >
            Mejor score
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {assets.map((asset) => (
          <Card
            key={asset.id}
            className="overflow-hidden p-0 group cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setSelected(asset)}
          >
            <div className="relative">
              <AssetThumb asset={asset} />
              {asset.aesthetic_score !== null && (
                <div className="absolute top-2 left-2">
                  <Badge variant={scoreBadgeVariant(asset.aesthetic_score)}>
                    {asset.aesthetic_score.toFixed(1)}
                  </Badge>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className="bg-white/80 backdrop-blur">
                  {asset.asset_type}
                </Badge>
              </div>
              <div
                className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white !text-slate-900 border-white flex-1"
                  onClick={() => setSelected(asset)}
                >
                  Ver
                </Button>
                {asset.asset_type === 'image' && (
                  <Button
                    size="sm"
                    onClick={() => onEvaluate(asset)}
                    disabled={evaluateAsset.isPending}
                  >
                    {evaluateAsset.isPending && evaluateAsset.variables?.id === asset.id ? (
                      <Spinner size="sm" />
                    ) : (
                      'IA'
                    )}
                  </Button>
                )}
                {asset.asset_type === 'image' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white"
                    onClick={() => setEditTarget(asset)}
                    aria-label="Iterar imagen"
                    title="Iterar con IA"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden>
                      tune
                    </span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(asset)}
                  disabled={deleteAsset.isPending && deleteAsset.variables?.id === asset.id}
                  aria-label="Eliminar asset"
                >
                  {deleteAsset.isPending && deleteAsset.variables?.id === asset.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]" aria-hidden>delete</span>
                  )}
                </Button>
              </div>
            </div>
            <div className="p-3">
              <div className="flex flex-wrap gap-1">
                {asset.tags.slice(0, 3).map((t) => (
                  <Badge key={t} variant="muted">
                    {t}
                  </Badge>
                ))}
                {asset.tags.length > 3 && (
                  <Badge variant="muted">+{asset.tags.length - 3}</Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl sm:max-h-[90vh] overflow-auto">
          {selected && (
            <div className="flex flex-col gap-5">
              <DialogTitle>Detalle del asset</DialogTitle>
              <DialogDescription>
                Subido el {formatDate(selected.created_at)}
              </DialogDescription>

              {selected.asset_type === 'image' ? (
                <img
                  src={selected.asset_url}
                  alt=""
                  className="w-full max-h-[420px] object-contain rounded-2xl bg-slate-50"
                />
              ) : (
                <a
                  href={selected.asset_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-sm"
                >
                  Abrir archivo
                </a>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {selected.aesthetic_score !== null && (
                  <Badge variant={scoreBadgeVariant(selected.aesthetic_score)}>
                    Score: {selected.aesthetic_score.toFixed(1)} / 10
                  </Badge>
                )}
                <Badge variant="outline">{selected.asset_type}</Badge>
              </div>

              {selected.marketing_feedback && (
                <section>
                  <h4 className="font-display text-lg font-bold mb-2">Feedback de marketing</h4>
                  <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {selected.marketing_feedback}
                  </p>
                </section>
              )}

              {selected.tags.length > 0 && (
                <section>
                  <h4 className="font-display text-lg font-bold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t) => (
                      <Badge key={t} variant="muted">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {suggestions.length > 0 && (
                <section>
                  <h4 className="font-display text-lg font-bold mb-2">Sugerencias</h4>
                  <ul className="flex flex-col gap-2">
                    {suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="material-symbols-outlined text-amber-600 text-[18px]">
                          check_circle
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex gap-2 justify-end flex-wrap">
                {selected.asset_type === 'image' && (
                  <Button
                    variant="outline"
                    onClick={() => onEvaluate(selected)}
                    disabled={evaluateAsset.isPending}
                  >
                    {evaluateAsset.isPending && evaluateAsset.variables?.id === selected.id ? (
                      <><Spinner size="sm" /> Evaluando...</>
                    ) : 'Re-evaluar con IA'}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete(selected);
                    setSelected(null);
                  }}
                  disabled={deleteAsset.isPending}
                >
                  {deleteAsset.isPending ? <Spinner size="sm" /> : null}
                  Eliminar
                </Button>
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
