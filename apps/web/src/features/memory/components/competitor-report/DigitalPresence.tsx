import { Badge, Button, Icon, Spinner } from '@radikal/ui';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Competitor } from '../../api/memory';
import { ReportSection } from './ReportSection';

interface Props {
  competitor: Competitor;
  onSyncSocial: () => void;
  syncing: boolean;
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: 'photo_camera',
  tiktok: 'music_note',
  facebook: 'thumb_up',
  youtube: 'play_circle',
  linkedin: 'work',
  x: 'alternate_email',
};

export function DigitalPresence({ competitor, onSyncSocial, syncing }: Props) {
  const sync = (competitor.sync_status ?? {}) as Record<
    string,
    { synced_at: string; post_count: number; handle?: string }
  >;
  const social = competitor.social_links ?? {};
  const networks = new Set([...Object.keys(social), ...Object.keys(sync)]);

  return (
    <ReportSection
      icon="hub"
      title="Presencia digital"
      subtitle="Sitio y redes detectadas"
      right={
        <Button variant="outline" size="sm" onClick={onSyncSocial} disabled={syncing}>
          {syncing ? <Spinner className="h-4 w-4" /> : <Icon name="sync" className="text-[16px]" />}
          Actualizar posts
        </Button>
      }
    >
      {networks.size === 0 && !competitor.website ? (
        <p className="text-sm text-slate-500">
          No detectamos presencia digital aún. Prueba añadir el sitio web o URLs de redes
          manualmente.
        </p>
      ) : (
        <div className="space-y-3">
          {competitor.website && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-white grid place-items-center shrink-0 text-slate-600">
                <Icon name="public" className="text-[20px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sitio web
                </p>
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[hsl(var(--color-primary))] hover:underline truncate block"
                >
                  {competitor.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </div>
          )}
          {Array.from(networks).map((platform) => {
            const meta = sync[platform];
            const url = social[platform];
            return (
              <div
                key={platform}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="w-10 h-10 rounded-lg bg-white grid place-items-center shrink-0 text-slate-600">
                  <Icon name={PLATFORM_ICONS[platform] ?? 'link'} className="text-[20px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider capitalize">
                    {platform}
                  </p>
                  {meta?.handle && (
                    <p className="text-sm font-medium text-slate-700">@{meta.handle}</p>
                  )}
                  {url && !meta?.handle && (
                    <p className="text-xs text-slate-500 truncate">{url}</p>
                  )}
                </div>
                {meta ? (
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <Badge variant="secondary">{meta.post_count} posts</Badge>
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(meta.synced_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                ) : (
                  <Badge variant="outline">Sin sincronizar</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ReportSection>
  );
}
