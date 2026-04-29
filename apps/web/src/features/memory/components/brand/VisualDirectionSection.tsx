import {
  Badge,
  Card,
  Icon,
} from '@radikal/ui';
import type { BrandProfile } from '../../api/memory';
import { SectionTitle } from './shared';
import type { ContentAssetLite } from './utils';

export function VisualDirectionSection({
  brand,
  instagramRefs,
  onImageClick,
  onDelete,
}: {
  brand: BrandProfile | null | undefined;
  instagramRefs: ContentAssetLite[];
  onImageClick: (asset: ContentAssetLite) => void;
  onDelete?: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <Card className="p-4 sm:p-6 md:p-8 bg-white">
      <SectionTitle icon="auto_awesome_motion">Dirección visual</SectionTitle>
      {brand?.visual_direction ? (
        <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap mb-6">
          {brand.visual_direction}
        </p>
      ) : (
        <p className="text-xs italic text-slate-400 mb-6">
          Sin dirección visual definida
        </p>
      )}

      {instagramRefs.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2">
              <Icon name="photo_camera" className="text-[16px]" />
              Referencias visuales (Instagram)
            </h4>
            <Badge variant="muted">{instagramRefs.length}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
            {instagramRefs.map((a) => (
              <div key={a.id} className="group relative">
                <button
                  onClick={() => onImageClick(a)}
                  type="button"
                  className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-80 hover:scale-[1.03] transition-all shadow-sm"
                >
                  <img
                    src={a.asset_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => onDelete(e, a.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                    title="Eliminar imagen"
                  >
                    <Icon name="delete" className="text-[12px]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
