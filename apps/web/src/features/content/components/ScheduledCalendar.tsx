import { useMemo, useState } from 'react';
import { Button, Card } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import type { ContentAsset } from '../api/content';
import {
  useMoveScheduledPost,
  type ScheduledPost,
  type ScheduledPostPlatform,
} from '../api/scheduler';

const PLATFORM_ICON: Record<ScheduledPostPlatform, string> = {
  instagram: 'photo_camera',
  tiktok: 'music_video',
  linkedin: 'business',
  facebook: 'groups',
  x: 'alternate_email',
  threads: 'forum',
  pinterest: 'push_pin',
  youtube: 'smart_display',
  other: 'public',
};

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarGrid(anchor: Date) {
  const first = startOfMonth(anchor);
  // ISO weekday: Mon=0..Sun=6
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  // Trim trailing row if not needed (keep 5 rows if possible)
  const rows = cells.length / 7;
  const lastRowStart = cells[cells.length - 7];
  if (
    rows === 6 &&
    lastRowStart &&
    lastRowStart.getMonth() !== anchor.getMonth()
  ) {
    return cells.slice(0, 35);
  }
  return cells;
}

interface Props {
  posts: ScheduledPost[];
  assetsById: Map<string, ContentAsset>;
  onCreateAtDate: (date: Date) => void;
  onEditPost: (post: ScheduledPost) => void;
}

export function ScheduledCalendar({ posts, assetsById, onCreateAtDate, onEditPost }: Props) {
  const { activeProject } = useProject();
  const { toast } = useToast();
  const projectId = activeProject?.id;
  const moveMut = useMoveScheduledPost();

  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const today = new Date();

  const cells = useMemo(() => buildCalendarGrid(anchor), [anchor]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const p of posts) {
      if (p.status === 'cancelled') continue;
      const k = dayKey(new Date(p.scheduled_at));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      );
    }
    return map;
  }, [posts]);

  // Slots suggestion: days without posts in next 14 days
  const suggestedEmptyDays = useMemo(() => {
    const set = new Set<string>();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const k = dayKey(d);
      if (!postsByDay.has(k)) set.add(k);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsByDay]);

  const monthLabel = `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const goPrev = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
  const goNext = () => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));
  const goToday = () => setAnchor(startOfMonth(new Date()));

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', postId);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== key) setDragOverKey(key);
  };

  const handleDragLeave = (key: string) => {
    if (dragOverKey === key) setDragOverKey(null);
  };

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDragOverKey(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id || !projectId) return;
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const current = new Date(post.scheduled_at);
    if (sameDay(current, day)) return;
    const newDate = new Date(day);
    newDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
    if (newDate.getTime() < Date.now() + 60_000) {
      toast({ title: 'No puedes mover un post al pasado', variant: 'error' });
      return;
    }
    moveMut.mutate(
      {
        id,
        project_id: projectId,
        scheduled_at: newDate.toISOString(),
      },
      {
        onError: () => toast({ title: 'No se pudo mover el post', variant: 'error' }),
        onSuccess: () => toast({ title: 'Post reagendado', variant: 'success' }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev} aria-label="Mes anterior">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} aria-label="Mes siguiente">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoy
          </Button>
          <h3 className="font-display text-lg font-bold ml-2 capitalize">{monthLabel}</h3>
        </div>
      </div>

      <Card className="p-0 overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[640px] border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-w-[640px] auto-rows-fr">
          {cells.map((day, idx) => {
            const k = dayKey(day);
            const inMonth = day.getMonth() === anchor.getMonth();
            const isToday = sameDay(day, today);
            const items = postsByDay.get(k) ?? [];
            const visible = items.slice(0, 3);
            const extraCount = items.length - visible.length;
            const isSuggested = inMonth && suggestedEmptyDays.has(k) && items.length === 0;
            const isDragOver = dragOverKey === k;

            return (
              <div
                key={idx}
                onClick={(e) => {
                  // Avoid triggering when clicking a post card
                  if ((e.target as HTMLElement).closest('[data-post-card]')) return;
                  onCreateAtDate(day);
                }}
                onDragOver={(e) => handleDragOver(e, k)}
                onDragLeave={() => handleDragLeave(k)}
                onDrop={(e) => handleDrop(e, day)}
                className={[
                  'min-h-[110px] border-b border-r border-slate-100 p-1.5 text-left cursor-pointer transition-colors',
                  inMonth ? 'bg-white' : 'bg-slate-50/60',
                  isDragOver ? 'bg-[hsl(var(--color-primary)/0.08)]' : '',
                  isToday
                    ? 'ring-2 ring-inset ring-[hsl(var(--color-primary))]'
                    : 'hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={[
                      'text-xs font-bold',
                      inMonth ? 'text-slate-800' : 'text-slate-400',
                      isToday ? 'text-[hsl(var(--color-primary))]' : '',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </span>
                  {isSuggested && (
                    <span
                      className="text-[9px] text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5 font-semibold"
                      title="Sugerencia: agendar aquí"
                    >
                      💡
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {visible.map((p) => {
                    const asset = p.asset_id ? assetsById.get(p.asset_id) : undefined;
                    const d = new Date(p.scheduled_at);
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    return (
                      <div
                        key={p.id}
                        data-post-card
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPost(p);
                        }}
                        className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-0.5 hover:border-[hsl(var(--color-primary))] hover:shadow-sm cursor-grab active:cursor-grabbing"
                      >
                        {asset ? (
                          <img
                            src={asset.asset_url}
                            alt=""
                            className="w-5 h-5 rounded object-cover shrink-0"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded bg-slate-100 grid place-items-center shrink-0">
                            <span className="material-symbols-outlined text-[12px] text-slate-400">
                              image
                            </span>
                          </span>
                        )}
                        <span className="text-[9px] font-semibold text-slate-600 shrink-0">
                          {hh}:{mm}
                        </span>
                        <div className="flex items-center gap-0.5 min-w-0">
                          {p.platforms.slice(0, 3).map((pl) => (
                            <span
                              key={pl}
                              className="material-symbols-outlined text-[11px] text-slate-500"
                            >
                              {PLATFORM_ICON[pl]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {extraCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const first = items[visible.length];
                        if (first) onEditPost(first);
                      }}
                      className="text-[10px] text-slate-500 hover:text-[hsl(var(--color-primary))] font-semibold"
                    >
                      +{extraCount} más
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
