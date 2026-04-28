import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@radikal/ui';
import { SectionTitle } from './shared';
import { extractVisualAnalysis, type ContentAssetLite } from './utils';

export function MoodboardSection({ assets }: { assets: ContentAssetLite[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const active = openIdx !== null ? assets[openIdx] : null;
  const activeVA = active ? extractVisualAnalysis(active) : null;
  return (
    <Card className="relative p-4 sm:p-6 md:p-8 bg-white border-white">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle icon="dashboard">Moodboard</SectionTitle>
      </div>
      <Badge variant="muted" className="absolute top-6 right-6">
        {assets.length}
      </Badge>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {assets.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-80 hover:scale-[1.02] transition-all shadow-sm"
          >
            <img
              src={a.asset_url}
              alt={a.ai_description ?? ''}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      <Dialog open={openIdx !== null} onOpenChange={(v) => (v ? null : setOpenIdx(null))}>
        <DialogContent className="max-w-[100vw] sm:max-w-3xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Imagen del moodboard</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <img
                src={active.asset_url}
                alt=""
                className="w-full max-h-[60vh] object-contain rounded-xl bg-slate-50"
              />
              {activeVA ? (
                <div className="space-y-3">
                  {activeVA.mood && (
                    <p className="text-xs">
                      <strong className="uppercase tracking-widest text-slate-500 mr-2">Mood</strong>
                      {activeVA.mood}
                    </p>
                  )}
                  {activeVA.lighting && (
                    <p className="text-xs">
                      <strong className="uppercase tracking-widest text-slate-500 mr-2">Iluminación</strong>
                      {activeVA.lighting}
                    </p>
                  )}
                  {activeVA.composition && (
                    <p className="text-xs">
                      <strong className="uppercase tracking-widest text-slate-500 mr-2">Composición</strong>
                      {activeVA.composition}
                    </p>
                  )}
                  {Array.isArray(activeVA.dominant_colors) && activeVA.dominant_colors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <strong className="text-[10px] uppercase tracking-widest text-slate-500">
                        Colores
                      </strong>
                      <div className="flex gap-2">
                        {activeVA.dominant_colors.slice(0, 5).map((c, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-lg border-2 border-white shadow-md"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(activeVA.style_tags) && activeVA.style_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeVA.style_tags.map((t, i) => (
                        <Badge key={i} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {activeVA.description && (
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {activeVA.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">
                  Aún sin análisis visual para esta imagen.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIdx(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
