import {
  Badge,
  Card,
} from '@radikal/ui';
import { SectionTitle } from './shared';
import { type ContentAssetLite } from './utils';

export function MoodboardSection({ 
  assets, 
  onImageClick 
}: { 
  assets: ContentAssetLite[], 
  onImageClick: (asset: ContentAssetLite) => void 
}) {
  return (
    <Card className="relative p-4 sm:p-6 md:p-8 bg-white border-white">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle icon="dashboard">Imágenes de la página web</SectionTitle>
      </div>
      <Badge variant="muted" className="absolute top-6 right-6">
        {assets.length}
      </Badge>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {assets.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onImageClick(a)}
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
    </Card>
  );
}
