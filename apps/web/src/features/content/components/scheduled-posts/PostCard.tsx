import { Badge, Button, Card, Icon, Spinner } from '@radikal/ui';
import type { ContentAsset } from '../../api/content';
import type { ScheduledPost } from '../../api/scheduler';
import { formatTime, platformIcon, platformLabel } from './helpers';

interface Props {
  post: ScheduledPost;
  asset: ContentAsset | undefined;
  onCancel: () => void;
  onEdit: () => void;
  cancelling: boolean;
}

export function PostCard({ post, asset, onCancel, onEdit, cancelling }: Props) {
  const date = new Date(post.scheduled_at);
  const isCancelled = post.status === 'cancelled';
  return (
    <Card className="p-4 flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-24 h-40 sm:h-24 rounded-xl bg-slate-100 shrink-0 overflow-hidden grid place-items-center">
        {asset ? (
          <img src={asset.asset_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon name="image" className="text-[28px] text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {post.platforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
            >
              <Icon name={platformIcon(p)} className="text-[14px]" />
              {platformLabel(p)}
            </span>
          ))}
          <Badge variant={isCancelled ? 'muted' : 'primary'}>
            {isCancelled ? 'Cancelado' : formatTime(date)}
          </Badge>
        </div>
        {post.caption && (
          <p
            className="text-sm text-slate-700 mb-2"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.caption}
          </p>
        )}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {post.hashtags.slice(0, 8).map((h) => (
              <span key={h} className="text-[11px] text-[hsl(var(--color-primary))] font-medium">
                #{h}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            disabled={isCancelled}
            className="min-h-[44px] sm:min-h-0"
          >
            <Icon name="edit" className="text-[16px]" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isCancelled || cancelling}
            className="min-h-[44px] sm:min-h-0"
          >
            {cancelling ? <Spinner size="sm" /> : <Icon name="cancel" className="text-[16px]" />}
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}
