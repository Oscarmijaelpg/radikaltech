import {
  Badge,
  Button,
  Card,
  Icon,
  Spinner,
} from '@radikal/ui';
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
          <Badge>Generado por Nexo</Badge>
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
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" onClick={onDownload}>
          <Icon name="download" className="text-[18px]" />
          Descargar
        </Button>
        <Button variant="outline" onClick={onRegenerate} disabled={loading}>
          <Icon name="refresh" className="text-[18px]" />
          Regenerar
        </Button>
        {current.assetId && (
          <Button
            variant="outline"
            onClick={() => onEdit(current.assetId!, current.url)}
          >
            <Icon name="tune" className="text-[18px]" />
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
              <Icon name="bookmark_add" className="text-[18px]" />
              Guardar en galería
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
