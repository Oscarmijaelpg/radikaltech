import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Spinner,
  Textarea,
  Checkbox,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import { useAssets, type ContentAsset } from '../api/content';
import { CaptionGeneratorDialog } from './CaptionGeneratorDialog';
import { ScheduledCalendar } from './ScheduledCalendar';
import {
  useScheduledPosts,
  useCreateScheduledPost,
  useCancelScheduledPost,
  useDeleteScheduledPost,
  useUpdateScheduledPost,
  type ScheduledPost,
  type ScheduledPostPlatform,
} from '../api/scheduler';

const PLATFORMS: Array<{ id: ScheduledPostPlatform; label: string; icon: string }> = [
  { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
  { id: 'tiktok', label: 'TikTok', icon: 'music_video' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'business' },
  { id: 'facebook', label: 'Facebook', icon: 'groups' },
  { id: 'x', label: 'X / Twitter', icon: 'alternate_email' },
  { id: 'threads', label: 'Threads', icon: 'forum' },
  { id: 'pinterest', label: 'Pinterest', icon: 'push_pin' },
  { id: 'youtube', label: 'YouTube', icon: 'smart_display' },
  { id: 'other', label: 'Otra', icon: 'public' },
];

const platformIcon = (p: ScheduledPostPlatform) =>
  PLATFORMS.find((x) => x.id === p)?.icon ?? 'public';
const platformLabel = (p: ScheduledPostPlatform) =>
  PLATFORMS.find((x) => x.id === p)?.label ?? p;

function formatDay(d: Date) {
  return d.toLocaleDateString('es', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minScheduledValue() {
  const d = new Date(Date.now() + 10 * 60 * 1000);
  return toDatetimeLocalValue(d);
}

interface PostCardProps {
  post: ScheduledPost;
  asset: ContentAsset | undefined;
  onCancel: () => void;
  onEdit: () => void;
  cancelling: boolean;
}

function PostCard({ post, asset, onCancel, onEdit, cancelling }: PostCardProps) {
  const date = new Date(post.scheduled_at);
  const isCancelled = post.status === 'cancelled';
  return (
    <Card className="p-4 flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-24 h-40 sm:h-24 rounded-xl bg-slate-100 shrink-0 overflow-hidden grid place-items-center">
        {asset ? (
          <img src={asset.asset_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-[28px] text-slate-400">image</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {post.platforms.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
            >
              <span className="material-symbols-outlined text-[14px]">{platformIcon(p)}</span>
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
          <Button size="sm" variant="outline" onClick={onEdit} disabled={isCancelled} className="min-h-[44px] sm:min-h-0">
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Editar
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={isCancelled || cancelling} className="min-h-[44px] sm:min-h-0">
            {cancelling ? <Spinner size="sm" /> : <span className="material-symbols-outlined text-[16px]">cancel</span>}
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface DialogState {
  open: boolean;
  editingId: string | null;
  assetId: string | null;
  caption: string;
  hashtags: string[];
  hashtagDraft: string;
  platforms: ScheduledPostPlatform[];
  scheduledAt: string;
  notes: string;
}

const initialDialogState: DialogState = {
  open: false,
  editingId: null,
  assetId: null,
  caption: '',
  hashtags: [],
  hashtagDraft: '',
  platforms: [],
  scheduledAt: minScheduledValue(),
  notes: '',
};

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
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
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
      .filter((p) => p.status !== 'cancelled' || true)
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
      // Default 10:00 local, but if the day is today and 10:00 is past, use min future
      d.setHours(10, 0, 0, 0);
      if (d.getTime() <= Date.now() + 10 * 60 * 1000) {
        const min = new Date(Date.now() + 15 * 60 * 1000);
        d.setFullYear(prefillDate.getFullYear(), prefillDate.getMonth(), prefillDate.getDate());
        if (d.getTime() <= Date.now() + 10 * 60 * 1000) {
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

  const addHashtag = () => {
    const v = dialog.hashtagDraft.trim().replace(/^#/, '');
    if (!v || dialog.hashtags.includes(v)) {
      setDialog((d) => ({ ...d, hashtagDraft: '' }));
      return;
    }
    setDialog((d) => ({ ...d, hashtags: [...d.hashtags, v], hashtagDraft: '' }));
  };
  const removeHashtag = (h: string) =>
    setDialog((d) => ({ ...d, hashtags: d.hashtags.filter((x) => x !== h) }));
  const togglePlatform = (p: ScheduledPostPlatform) =>
    setDialog((d) => ({
      ...d,
      platforms: d.platforms.includes(p)
        ? d.platforms.filter((x) => x !== p)
        : [...d.platforms, p],
    }));

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

  if (!activeProject) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-500">Selecciona un proyecto para ver tus posts agendados.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-cyan-50 border border-cyan-100 px-4 py-3 text-sm text-cyan-900 flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
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
              <span className="material-symbols-outlined text-[16px]">view_list</span>
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
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              Calendario
            </button>
          </div>
          <Button onClick={() => openCreate()}>
            <span className="material-symbols-outlined text-[18px]">add</span>
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
          icon={<span className="material-symbols-outlined text-[28px]">event_upcoming</span>}
          title="Sin posts agendados"
          description="Crea tu primer post agendado para planificar tu contenido."
          action={
            <Button onClick={() => openCreate()}>
              <span className="material-symbols-outlined text-[18px]">add</span>
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

      <Dialog open={dialog.open} onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.editingId ? 'Editar post agendado' : 'Nuevo post agendado'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Asset picker */}
            <div>
              <p className="text-sm font-semibold mb-2">Asset (opcional)</p>
              {preferredAssets.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No hay imágenes disponibles. Sube o genera imágenes primero.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setDialog((d) => ({ ...d, assetId: null }))}
                    className={
                      dialog.assetId === null
                        ? 'aspect-square rounded-xl border-2 border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)] grid place-items-center'
                        : 'aspect-square rounded-xl border-2 border-slate-200 bg-slate-50 grid place-items-center hover:border-slate-300'
                    }
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-400">block</span>
                  </button>
                  {preferredAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setDialog((d) => ({ ...d, assetId: a.id }))}
                      className={
                        dialog.assetId === a.id
                          ? 'aspect-square rounded-xl overflow-hidden border-2 border-[hsl(var(--color-primary))] ring-2 ring-[hsl(var(--color-primary)/0.3)]'
                          : 'aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-slate-300'
                      }
                    >
                      <img src={a.asset_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Caption</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCaptionDialogOpen(true)}
                    >
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      Generar caption con IA
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    Genera 3 variantes por plataforma en tu tono de marca
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                rows={4}
                value={dialog.caption}
                onChange={(e) => setDialog((d) => ({ ...d, caption: e.target.value }))}
                placeholder="Texto del post..."
              />
            </div>

            {/* Hashtags */}
            <div>
              <p className="text-sm font-semibold mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {dialog.hashtags.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-xs font-semibold"
                  >
                    #{h}
                    <button type="button" onClick={() => removeHashtag(h)} aria-label={`Quitar ${h}`}>
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={dialog.hashtagDraft}
                  onChange={(e) => setDialog((d) => ({ ...d, hashtagDraft: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addHashtag();
                    }
                  }}
                  placeholder="Añadir hashtag (Enter)"
                  containerClassName="flex-1"
                />
                <Button type="button" variant="outline" onClick={addHashtag}>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </Button>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <p className="text-sm font-semibold mb-2">Plataformas</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const checked = dialog.platforms.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={
                        checked
                          ? 'flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)] cursor-pointer'
                          : 'flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-slate-300'
                      }
                    >
                      <Checkbox checked={checked} onCheckedChange={() => togglePlatform(p.id)} />
                      <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
                      <span className="text-sm font-semibold">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Scheduled at */}
            <div>
              <p className="text-sm font-semibold mb-2">Fecha y hora</p>
              <input
                type="datetime-local"
                min={minScheduledValue()}
                value={dialog.scheduledAt}
                onChange={(e) => setDialog((d) => ({ ...d, scheduledAt: e.target.value }))}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">Mínimo 10 minutos en el futuro.</p>
            </div>

            {/* Notes */}
            <div>
              <p className="text-sm font-semibold mb-2">Notas (opcional)</p>
              <Textarea
                rows={2}
                value={dialog.notes}
                onChange={(e) => setDialog((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Referencias internas, briefs..."
              />
            </div>
          </div>

          <DialogFooter>
            {dialog.editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  if (!projectId || !dialog.editingId) return;
                  deleteMut.mutate({ id: dialog.editingId, project_id: projectId });
                  setDialog(initialDialogState);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialog(initialDialogState)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void onSubmit()}
              disabled={!canSubmit || createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? (
                <><Spinner size="sm" /> Guardando...</>
              ) : dialog.editingId ? 'Guardar cambios' : 'Agendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CaptionGeneratorDialog
        open={captionDialogOpen}
        onOpenChange={setCaptionDialogOpen}
        defaultPlatform={dialog.platforms[0] ?? 'instagram'}
        assetId={dialog.assetId}
        onUseCaption={(caption, hashtags) =>
          setDialog((d) => ({
            ...d,
            caption,
            hashtags: Array.from(new Set([...d.hashtags, ...hashtags])),
          }))
        }
      />
    </div>
  );
}
