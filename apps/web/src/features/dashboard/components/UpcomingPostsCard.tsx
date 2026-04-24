import { useNavigate } from 'react-router-dom';
import { Button, Card, Icon } from '@radikal/ui';
import type { ScheduledPost } from '@/features/content/api/scheduler';

interface Props {
  posts: ScheduledPost[] | undefined;
  loading: boolean;
}

export function UpcomingPostsCard({ posts, loading }: Props) {
  const navigate = useNavigate();
  const items = posts ?? [];

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-display font-black text-sm sm:text-base">Próximos agendados</h3>
        <Button variant="ghost" size="sm" onClick={() => navigate('/content?tab=scheduled')}>
          Ver todos
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">Sin posts agendados</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.slice(0, 3).map((p) => {
            const date = new Date(p.scheduled_at);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate('/content?tab=scheduled')}
                  className="w-full text-left py-2 flex items-center gap-3 hover:bg-slate-50 px-2 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-white shrink-0">
                    <Icon name="schedule" className="text-[16px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {p.caption?.slice(0, 60) || p.platforms.join(', ') || 'Post agendado'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {date.toLocaleString('es', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
