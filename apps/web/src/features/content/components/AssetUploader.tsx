import { useState, useRef } from 'react';
import { FileUpload, Card, Spinner, Badge, Button } from '@radikal/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import {
  useCreateAsset,
  useEvaluateAsset,
  useUpdateAsset,
  type AssetType,
  type ContentAsset,
} from '../api/content';

interface UploadItem {
  id: string;
  file: File;
  status: 'uploading' | 'creating' | 'evaluating' | 'done' | 'error';
  progress: number;
  error?: string;
  asset_id?: string;
}

function mimeToAssetType(mime: string): AssetType | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf' || mime.startsWith('application/')) return 'document';
  return null;
}

interface Props {
  tags?: string[];
  onUploadComplete?: (assets: ContentAsset[]) => void;
}

export function AssetUploader({ tags = [], onUploadComplete }: Props = {}) {
  const { user } = useAuth();
  const { activeProject } = useProject();
  const [items, setItems] = useState<UploadItem[]>([]);
  const createAsset = useCreateAsset();
  const evaluateAsset = useEvaluateAsset();
  const updateAsset = useUpdateAsset();
  const completedAssetsRef = useRef<ContentAsset[]>([]);

  const updateItem = (id: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  async function handleOneFile(file: File): Promise<ContentAsset | null> {
    if (!user || !activeProject) return null;
    const id = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      { id, file, status: 'uploading', progress: 0 },
    ]);

    try {
      const assetType = mimeToAssetType(file.type);
      if (!assetType) {
        updateItem(id, { status: 'error', error: 'Tipo de archivo no soportado' });
        return null;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${activeProject.id}/${id}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from('assets')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (upErr) {
        updateItem(id, { status: 'error', error: upErr.message });
        return null;
      }

      const { data: pub } = supabase.storage.from('assets').getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      updateItem(id, { status: 'creating', progress: 60 });

      const asset = await createAsset.mutateAsync({
        project_id: activeProject.id,
        asset_url: publicUrl,
        asset_type: assetType,
        metadata: {
          size: file.size,
          mime_type: file.type,
          original_name: file.name,
        },
      });
      
      if (tags.length > 0) {
         await updateAsset.mutateAsync({ id: asset.id, project_id: activeProject.id, tags });
      }

      updateItem(id, { status: 'evaluating', progress: 80, asset_id: asset.id });

      if (assetType === 'image') {
        try {
          await evaluateAsset.mutateAsync({ id: asset.id, project_id: activeProject.id });
        } catch {
          // evaluation failure shouldn't prevent upload from being considered successful
        }
      }

      updateItem(id, { status: 'done', progress: 100 });
      return asset;
    } catch (err) {
      updateItem(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
      return null;
    }
  }

  const onFiles = async (files: File[]) => {
    completedAssetsRef.current = [];
    const results = await Promise.all(files.map(handleOneFile));
    const successfulAssets = results.filter((r): r is ContentAsset => r !== null);
    if (successfulAssets.length > 0 && onUploadComplete) {
      onUploadComplete(successfulAssets);
    }
  };

  const clearCompleted = () =>
    setItems((prev) => prev.filter((it) => it.status !== 'done' && it.status !== 'error'));

  if (!activeProject) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        Selecciona un proyecto para subir assets.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FileUpload
        multiple
        accept="image/*,video/*,application/pdf"
        label="Arrastra o selecciona imágenes, videos o PDFs"
        description="Las imágenes se evalúan automáticamente con IA."
        onFilesSelected={onFiles}
      />

      {items.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold">Progreso de subida</h3>
            <Button variant="ghost" onClick={clearCompleted}>
              Limpiar completados
            </Button>
          </div>
          <ul className="flex flex-col gap-3">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.file.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={
                        it.status === 'error'
                          ? 'h-full bg-red-500'
                          : 'h-full bg-amber-500 transition-all duration-300'
                      }
                      style={{ width: `${it.progress}%` }}
                    />
                  </div>
                  {it.error && (
                    <p className="text-xs text-red-600 mt-1">{it.error}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {it.status === 'uploading' && (
                    <Badge variant="outline">
                      <Spinner className="h-3 w-3 mr-1" /> Subiendo
                    </Badge>
                  )}
                  {it.status === 'creating' && (
                    <Badge variant="outline">
                      <Spinner className="h-3 w-3 mr-1" /> Registrando
                    </Badge>
                  )}
                  {it.status === 'evaluating' && (
                    <Badge variant="outline">
                      <Spinner className="h-3 w-3 mr-1" /> Evaluando IA
                    </Badge>
                  )}
                  {it.status === 'done' && <Badge>Listo</Badge>}
                  {it.status === 'error' && <Badge variant="destructive">Error</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
