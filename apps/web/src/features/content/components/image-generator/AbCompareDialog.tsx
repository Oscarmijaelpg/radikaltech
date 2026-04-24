import { Badge, Button, Dialog, DialogContent, DialogTitle } from '@radikal/ui';
import type { GenerateResult } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: GenerateResult;
  abPair: { a: number; b: number };
  onSetAbPair: (updater: (p: { a: number; b: number }) => { a: number; b: number }) => void;
  onPrefer: (key: 'a' | 'b', idx: number, assetId: string | undefined) => Promise<void> | void;
}

export function AbCompareDialog({
  open,
  onOpenChange,
  current,
  abPair,
  onSetAbPair,
  onPrefer,
}: Props) {
  if (!current.variations || current.variations.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl sm:max-h-[90vh] overflow-auto">
        <DialogTitle>Comparar A vs B</DialogTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {(['a', 'b'] as const).map((key) => {
            const idx = abPair[key];
            const v = current.variations![idx];
            if (!v) return <div key={key} />;
            return (
              <div key={key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Badge>
                    {key.toUpperCase()} · {v.variant_label}
                  </Badge>
                  {typeof v.quality_score === 'number' && (
                    <Badge variant="muted">score {v.quality_score}/10</Badge>
                  )}
                </div>
                <div className="rounded-2xl overflow-hidden bg-slate-100">
                  <img src={v.url} alt={v.variant_label} className="w-full h-auto object-contain" />
                </div>
                <Button onClick={() => void onPrefer(key, idx, v.assetId)}>
                  Preferir {key.toUpperCase()}
                </Button>
              </div>
            );
          })}
        </div>
        {current.variations.length > 2 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            <p className="text-xs text-slate-500 w-full">Elegir variantes a comparar:</p>
            {current.variations.map((_, i) => (
              <Button
                key={i}
                size="sm"
                variant={abPair.a === i || abPair.b === i ? 'primary' : 'outline'}
                onClick={() => {
                  onSetAbPair((p) => {
                    if (p.a === i) return p;
                    if (p.b === i) return p;
                    return { a: p.b, b: i };
                  });
                }}
              >
                V{i + 1}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
