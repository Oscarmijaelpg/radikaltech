import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Icon, Spinner } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import { useAssets, type ContentAsset } from '../api/content';
import { ScheduledCalendar } from './ScheduledCalendar';
import {
  useCancelScheduledPost,
  useCreateScheduledPost,
  useDeleteScheduledPost,
  useScheduledPosts,
  useUpdateScheduledPost,
  type ScheduledPost,
} from '../api/scheduler';
import { PostCard } from './scheduled-posts/PostCard';
import { PostDialog } from './scheduled-posts/PostDialog';
import {
  type DialogState,
  dayKey,
  formatDay,
  initialDialogState,
  minScheduledValue,
  toDatetimeLocalValue,
} from './scheduled-posts/helpers';

const PREFILL_DEFAULT_HOUR = 10;
const MIN_FUTURE_MS = 10 * 60 * 1000;
const MIN_FUTURE_FALLBACK_MS = 15 * 60 * 1000;

export function ScheduledPostsTab() {
  const { activeProject } = useProject();
  const { toast } = useToast();
  const projectId = activeProject?.id;

  const query = useScheduledPosts(projectId);
  const imageAssets = useAssets(projectId, { type: 'image' });
  const createMut = useCreateScheduledPost();
  const updateMut = useUpdateScheduledPost();
  const cancelMut = useCancelScheduledPost();
  const deleteMut = useDeleteScheduledPost();

  const [dialog, setDialog] = useState<DialogState>(initialDialogState);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const assetsById = useMemo(() => {
    const map = new Map<string, ContentAsset>();
    (imageAssets.data ?? []).forEach((a) => map.set(a.id, a));
    return map;
  }, [imageAssets.data]);

  const preferredAssets = useMemo(() => {
    const list = imageAssets.data ?? [];
    const preferred = list.filter((a) => a.tags?.includes('generated'));
    const rest = list.filter((a) => !a.tags?.includes('generated'));
    return [...preferred, ...rest];
  }, [imageAssets.data]);

  const grouped = useMemo(() => {
    const items = (query.data ?? [])
      .slice()
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const map = new Map<string, ScheduledPost[]>();
    for (const p of items) {
      const k = dayKey(new Date(p.scheduled_at));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return Array.from(map.entries());
  }, [query.data]);

  const openCreate = (prefillDate?: Date) => {
    let scheduledAt = minScheduledValue();
    if (prefillDate) {
      const d = new Date(prefillDate);
      d.setHours(PREFILL_DEFAULT_HOUR, 0, 0, 0);
      if (d.getTime() <= Date.now() + MIN_FUTURE_MS) {
        const min = new Date(Date.now() + MIN_FUTURE_FALLBACK_MS);
        d.setFullYear(prefillDate.getFullYear(), prefillDate.getMonth(), prefillDate.getDate());
        if (d.getTime() <= Date.now() + MIN_FUTURE_MS) {
          d.setTime(min.getTime());
        }
      }
      scheduledAt = toDatetimeLocalValue(d);
    }
    setDialog({ ...initialDialogState, open: true, scheduledAt });
  };

  const openEdit = (post: ScheduledPost) => {
    setDialog({
      open: true,
      editingId: post.id,
      assetId: post.asset_id,
      caption: post.caption ?? '',
      hashtags: post.hashtags,
      hashtagDraft: '',
      platforms: post.platforms,
      scheduledAt: toDatetimeLocalValue(new Date(post.scheduled_at)),
      notes: post.notes ?? '',
    });
  };

  const canSubmit =
    !!projectId &&
    dialog.platforms.length > 0 &&
    dialog.scheduledAt.length > 0 &&
    new Date(dialog.scheduledAt).getTime() > Date.now();

  const onSubmit = async () => {
    if (!projectId || !canSubmit) return;
    const scheduledIso = new Date(dialog.scheduledAt).toISOString();
    try {
      if (dialog.editingId) {
        await updateMut.mutateAsync({
          id: dialog.editingId,
          project_id: projectId,
          asset_id: dialog.assetId,
          platforms: dialog.platforms,
          caption: dialog.caption || null,
          hashtags: dialog.hashtags,
          scheduled_at: scheduledIso,
          notes: dialog.notes || null,
        });
        toast({ title: 'Post actualizado', variant: 'success' });
      } else {
        await createMut.mutateAsync({
          project_id: projectId,
          asset_id: dialog.assetId,
          platforms: dialog.platforms,
          caption: dialog.caption || null,
          hashtags: dialog.hashtags,
          scheduled_at: scheduledIso,
          notes: dialog.notes || null,
        });
        toast({ title: 'Post agendado', variant: 'success' });
      }
      setDialog(initialDialogState);
    } catch {
      toast({ title: 'No se pudo guardar', variant: 'error' });
    }
  };

  const onCancelPost = (post: ScheduledPost) => {
    if (!projectId) return;
    cancelMut.mutate({ id: post.id, project_id: projectId });
  };

  const onDeleteFromDialog = () => {
    if (!projectId || !dialog.editingId) return;
    deleteMut.mutate({ id: dialog.editingId, project_id: projectId });
    setDialog(initialDialogState);
  };

  if (!activeProject) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-500">
          Selecciona un proyecto para ver tus posts agendados.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-cyan-50 border border-cyan-100 px-4 py-3 text-sm text-cyan-900 flex items-start gap-2">
        <Icon name="info" className="text-[18px] mt-0.5" />
        <p>
          Los posts se guardan en Radikal como recordatorio. La publicación automática en redes
          requiere integración con OAuth (próximamente).
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-bold">Próximos posts</h3>
          <p className="text-xs text-slate-500">
            {(query.data ?? []).length} agendados en este proyecto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={
                viewMode === 'list'
                  ? 'px-3 py-1.5 text-xs font-semibold bg-[hsl(var(--color-primary))] text-white flex items-center gap-1'
                  : 'px-3 py-1.5 text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 flex items-center gap-1'
              }
            >
              <Icon name="view_list" className="text-[16px]" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={
                viewMode === 'calendar'
                  ? 'px-3 py-1.5 text-xs font-semibold bg-[hsl(var(--color-primary))] text-white flex items-center gap-1'
                  : 'px-3 py-1.5 text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50 flex items-center gap-1'
              }
            >
              <Icon name="calendar_month" className="text-[16px]" />
              Calendario
            </button>
          </div>
          <Button onClick={() => openCreate()}>
            <Icon name="add" className="text-[18px]" />
            Nuevo post
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="py-10 grid place-items-center">
          <Spinner />
        </div>
      ) : viewMode === 'calendar' ? (
        <ScheduledCalendar
          posts={query.data ?? []}
          assetsById={assetsById}
          onCreateAtDate={(d) => openCreate(d)}
          onEditPost={(p) => openEdit(p)}
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Icon name="event_upcoming" className="text-[28px]" />}
          title="Sin posts agendados"
          description="Crea tu primer post agendado para planificar tu contenido."
          action={
            <Button onClick={() => openCreate()}>
              <Icon name="add" className="text-[18px]" />
              Agendar post
            </Button>
          }
        />
      ) : (
        grouped.map(([k, posts]) => {
          const first = posts[0];
          if (!first) return null;
          const date = new Date(first.scheduled_at);
          return (
            <section key={k} className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-tighter opacity-60">
                {formatDay(date)}
              </h4>
              <div className="space-y-3">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    asset={p.asset_id ? assetsById.get(p.asset_id) : undefined}
                    onCancel={() => onCancelPost(p)}
                    onEdit={() => openEdit(p)}
                    cancelling={cancelMut.isPending && cancelMut.variables?.id === p.id}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      <PostDialog
        dialog={dialog}
        preferredAssets={preferredAssets}
        isSubmitting={createMut.isPending || updateMut.isPending}
        canSubmit={canSubmit}
        onChange={(updater) => setDialog(updater)}
        onClose={() => setDialog(initialDialogState)}
        onSubmit={onSubmit}
        onDelete={dialog.editingId ? onDeleteFromDialog : undefined}
      />
    </div>
  );
}
