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
  const list = useAssets(projectId, { type: 'image', sort: 'recent', limit: 100 });
  const createAsset = useCreateAsset();
  const evaluateAsset = useEvaluateAsset();

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSelectedIds(initialSelectedIds);
  }, [open, initialSelectedIds]);

  const assets = (list.data ?? []).filter(a => !a.tags?.some(t => ['chat', 'generated', 'ai', 'selected'].includes(t)));
  
  // Categorization
  const categories = useMemo(() => {
    const brand = assets.filter(a => a.tags?.some(t => ['logo', 'instagram', 'moodboard', 'website_auto', 'social_auto', 'web', 'product', 'social_media'].includes(t)));
    const uploads = assets.filter(a => !brand.includes(a));
    
    return [
      { id: 'brand', label: 'Mi Marca (Escrapeo)', items: brand, icon: 'branding_watermark' },
      { id: 'uploads', label: 'Subidas / Referencias', items: uploads, icon: 'upload_file' }
    ].filter(c => c.items.length > 0);
  }, [assets]);

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
          tags: ['user_uploaded']
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
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

        <div className="flex-1 overflow-y-auto pr-2">
          {list.isLoading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : assets.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              No tienes imágenes. Sube una con el botón de arriba.
            </p>
          ) : (
            <div className="space-y-8 pb-4">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center text-slate-600">
                      <Icon name={cat.icon} className="text-[18px]" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                      {cat.label}
                    </h4>
                    <span className="text-xs text-slate-400">({cat.items.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {cat.items.map((a) => {
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
                          {a.tags?.includes('logo') && (
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-pink-500 text-[8px] font-black uppercase text-white shadow-lg">
                              Logo
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
