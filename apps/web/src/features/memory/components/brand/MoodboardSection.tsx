import { useState } from 'react';
import {
  Badge,
  Card,
} from '@radikal/ui';
import { SectionTitle } from './shared';
import { type ContentAssetLite } from './utils';
import { ImageAnalysisDialog } from '@/features/content/components/ImageAnalysisDialog';

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
      <ImageAnalysisDialog
        asset={active ? {
          id: active.id,
          asset_url: active.asset_url,
          aesthetic_score: active.aesthetic_score,
          ai_description: active.ai_description,
          marketing_feedback: active.marketing_feedback,
          tags: active.tags
        } : null}
        open={openIdx !== null}
        onOpenChange={(v) => !v && setOpenIdx(null)}
      />
    </Card>
  );
}
