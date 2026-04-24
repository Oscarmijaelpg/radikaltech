import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FileUpload,
  Icon,
  Spinner,
} from '@radikal/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useAssets, useCreateAsset, useEvaluateAsset, type ContentAsset } from '../api/content';

interface ReferencePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | undefined;
  initialSelectedIds: string[];
  maxSelection?: number;
  onConfirm: (assets: ContentAsset[]) => void;
}

export function ReferencePicker({
  open,
  onOpenChange,
  projectId,
  initialSelectedIds,
  maxSelection = 6,
  onConfirm,
}: ReferencePickerProps) {
  const { user } = useAuth();
  const list = useAssets(projectId, { type: 'image', sort: 'recent' });
  const createAsset = useCreateAsset();
  const evaluateAsset = useEvaluateAsset();

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSelectedIds(initialSelectedIds);
  }, [open, initialSelectedIds]);

  const assets = list.data ?? [];
  const assetById = useMemo(() => {
    const m = new Map<string, ContentAsset>();
    for (const a of assets) m.set(a.id, a);
    return m;
  }, [assets]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSelection) return prev;
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    const picked: ContentAsset[] = [];
    for (const id of selectedIds) {
      const a = assetById.get(id);
      if (a) picked.push(a);
    }
    onConfirm(picked);
    onOpenChange(false);
  };

  const handleUpload = async (files: File[]) => {
    if (!projectId || !user || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Solo imágenes');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from('assets')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('assets').getPublicUrl(path);
      const asset = await createAsset.mutateAsync({
        project_id: projectId,
        asset_url: pub.publicUrl,
        asset_type: 'image',
        metadata: {
          size: file.size,
          mime_type: file.type,
          original_name: file.name,
          source: 'reference_picker',
        },
      });
      // Auto-select
      setSelectedIds((prev) =>
        prev.includes(asset.id) || prev.length >= maxSelection ? prev : [...prev, asset.id],
      );
      // Best effort evaluate (non-blocking)
      void evaluateAsset.mutateAsync({ id: asset.id, project_id: projectId }).catch(() => {});
      await list.refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Elegir referencias
            <span
              className="inline-flex items-center text-slate-400 cursor-help"
              title="Las referencias guían visualmente a la IA para generar imágenes coherentes"
              aria-label="Las referencias guían visualmente a la IA para generar imágenes coherentes"
            >
              <Icon name="info" className="text-[16px]" />
            </span>
          </DialogTitle>
          <DialogDescription>
            Selecciona hasta {maxSelection} imágenes de tu galería para guiar a la IA.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <Badge variant="muted">
            {selectedIds.length} / {maxSelection} seleccionadas
          </Badge>
          <div className="max-w-xs">
            <FileUpload
              accept="image/*"
              label={uploading ? 'Subiendo...' : 'Subir nueva'}
              description=""
              onFilesSelected={(files) => void handleUpload(files)}
            />
          </div>
        </div>
        {uploadError && (
          <p className="text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg mb-3">
            {uploadError}
          </p>
        )}

        <div className="max-h-[50vh] overflow-y-auto">
          {list.isLoading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : assets.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              No tienes imágenes. Sube una con el botón de arriba.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map((a) => {
                const selected = selectedIds.includes(a.id);
                const disabled = !selected && selectedIds.length >= maxSelection;
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => !disabled && toggle(a.id)}
                    className={
                      'group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border-2 transition-all ' +
                      (selected
                        ? 'border-fuchsia-500 ring-2 ring-fuchsia-300'
                        : disabled
                          ? 'border-transparent opacity-40 cursor-not-allowed'
                          : 'border-transparent hover:border-slate-300')
                    }
                    title={a.ai_description ?? ''}
                  >
                    <img
                      src={a.asset_url}
                      alt={a.ai_description ?? 'asset'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2">
                      <Checkbox checked={selected} tabIndex={-1} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Aceptar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
