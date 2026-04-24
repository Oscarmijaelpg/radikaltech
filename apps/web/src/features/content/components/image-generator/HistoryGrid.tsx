import { Badge, Card } from '@radikal/ui';
import type { ContentAssetDTO } from './types';

interface Props {
  activeProjectId: string | undefined;
  isLoading: boolean;
  assets: ContentAssetDTO[];
}

export function HistoryGrid({ activeProjectId, isLoading, assets }: Props) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold">Historial de imágenes</h3>
        <Badge variant="muted">{assets.length}</Badge>
      </div>
      {!activeProjectId ? (
        <p className="text-sm text-slate-500">Selecciona un proyecto para ver tu historial.</p>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no has generado imágenes en este proyecto.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((a) => (
            <a
              key={a.id}
              href={a.asset_url}
              target="_blank"
              rel="noreferrer noopener"
              className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 block"
              title={a.ai_description ?? ''}
            >
              <img
                src={a.asset_url}
                alt={a.ai_description ?? 'asset'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
