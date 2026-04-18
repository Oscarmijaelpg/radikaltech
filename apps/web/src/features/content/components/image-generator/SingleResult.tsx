import { Badge, Button, Card, Spinner } from '@radikal/ui';
import type { GenerateResult } from './types';

interface Props {
  current: GenerateResult;
  loading: boolean;
  saving: boolean;
  activeProjectId: string | undefined;
  onDownload: () => void;
  onRegenerate: () => void;
  onEdit: (assetId: string, url: string) => void;
  onSaveToGallery: () => Promise<void> | void;
}

export function SingleResult({
  current,
  loading,
  saving,
  activeProjectId,
  onDownload,
  onRegenerate,
  onEdit,
  onSaveToGallery,
}: Props) {
  if (current.variations && current.variations.length > 1) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-lg font-bold">Tu imagen</h3>
        <div className="flex gap-2 flex-wrap">
          <Badge>
            {current.model === 'gemini-2.5-flash-image'
              ? 'Generado con Gemini 2.5'
              : 'Generado con DALL-E 3'}
          </Badge>
          <Badge variant="muted">{current.size}</Badge>
          <Badge variant="muted">{current.style}</Badge>
          {current.variations?.[0]?.quality_score !== undefined && (
            <Badge variant="muted">
              score {current.variations[0]!.quality_score}/10
            </Badge>
          )}
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-100 mb-4">
        <img
          src={current.url}
          alt={current.prompt}
          className="w-full h-auto object-contain max-h-[600px]"
        />
      </div>
      <p className="text-sm text-slate-600 mb-4 italic">&ldquo;{current.prompt}&rdquo;</p>
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" onClick={onDownload}>
          <span className="material-symbols-outlined text-[18px]">download</span>
          Descargar
        </Button>
        <Button variant="outline" onClick={onRegenerate} disabled={loading}>
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Regenerar
        </Button>
        {current.assetId && (
          <Button
            variant="outline"
            onClick={() => onEdit(current.assetId!, current.url)}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Iterar
          </Button>
        )}
        <Button onClick={() => void onSaveToGallery()} disabled={!activeProjectId || saving}>
          {saving ? (
            <>
              <Spinner size="sm" />
              Guardando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
              Guardar en galería
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
