import {
  Badge,
  Card,
  Icon,
} from '@radikal/ui';
import { SectionTitle } from './shared';
import { type ContentAssetLite } from './utils';

export function MoodboardSection({ 
  assets, 
  onImageClick,
  onDelete
}: { 
  assets: ContentAssetLite[], 
  onImageClick: (asset: ContentAssetLite) => void,
  onDelete?: (e: React.MouseEvent, id: string) => void
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
          <div key={a.id} className="group relative">
            <button
              type="button"
              onClick={() => onImageClick(a)}
              className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-80 hover:scale-[1.02] transition-all shadow-sm"
            >
              <img
                src={a.asset_url}
                alt={a.ai_description ?? ''}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
            {onDelete && (
              <button
                onClick={(e) => onDelete(e, a.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                title="Eliminar imagen"
              >
                <Icon name="delete" className="text-[14px]" />
              </button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
