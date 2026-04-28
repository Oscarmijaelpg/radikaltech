import {
  Badge,
  Button,
  Card,
  Icon,
} from '@radikal/ui';
import type { GenerateResult } from './types';

interface Props {
  current: GenerateResult;
  selectedVariantIdx: number | null;
  onSelectVariant: (idx: number) => Promise<void> | void;
  onEditVariant: (assetId: string, url: string) => void;
  onDownloadVariant: (url: string, index: number, jobId: string) => void;
  onOpenCompare: () => void;
}

export function VariationsGrid({
  current,
  selectedVariantIdx,
  onSelectVariant,
  onEditVariant,
  onDownloadVariant,
  onOpenCompare,
}: Props) {
  if (!current.variations || current.variations.length <= 1) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-lg font-bold">
          {current.variations.length} variantes
        </h3>
        <div className="flex gap-2 flex-wrap items-center">
          <Badge variant="muted">{current.size}</Badge>
          <Badge variant="muted">{current.style}</Badge>
          {current.variations.length >= 2 && (
            <Button variant="outline" size="sm" onClick={onOpenCompare}>
              <Icon name="compare" className="text-[16px]" />
              Comparar A vs B
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {current.variations.map((v, i) => {
          const isSelected = selectedVariantIdx === i;
          return (
            <div
              key={i}
              className={`rounded-2xl overflow-hidden bg-slate-100 border-2 ${
                isSelected ? 'border-fuchsia-500' : 'border-transparent'
              } relative group`}
            >
              <img
                src={v.url}
                alt={v.variant_label}
                className="w-full h-auto object-contain max-h-[380px]"
              />
              <div className="p-3 bg-white">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge>{v.variant_label}</Badge>
                  {typeof v.quality_score === 'number' && (
                    <Badge variant="muted">score {v.quality_score}/10</Badge>
                  )}
                  {isSelected && <Badge variant="success">Favorita</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void onSelectVariant(i)}>
                    <Icon name="favorite" className="text-[16px]" />
                    Elegir esta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (v.assetId) onEditVariant(v.assetId, v.url);
                    }}
                    disabled={!v.assetId}
                  >
                    <Icon name="tune" className="text-[16px]" />
                    Iterar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownloadVariant(v.url, i, current.jobId)}
                  >
                    <Icon name="download" className="text-[16px]" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
