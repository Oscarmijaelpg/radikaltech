import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Icon,
  Spinner,
  Textarea,
} from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { cn } from '@/shared/utils/cn';
import {
  type Recommendation,
  type RecommendationImpact,
  type RecommendationKind,
  type RecommendationSource,
  useAddRecommendationNote,
  useDeleteRecommendation,
  useUpdateRecommendationStatus,
} from '../api/recommendations';

const KIND_META: Record<
  RecommendationKind,
  { icon: string; label: string; tint: string }
> = {
  post: { icon: 'edit', label: 'Post', tint: 'bg-pink-100 text-pink-700' },
  campaign: { icon: 'campaign', label: 'Campaña', tint: 'bg-fuchsia-100 text-fuchsia-700' },
  strategy: {
    icon: 'tips_and_updates',
    label: 'Estrategia',
    tint: 'bg-violet-100 text-violet-700',
  },
  report: { icon: 'insights', label: 'Reporte', tint: 'bg-emerald-100 text-emerald-700' },
  content_improvement: {
    icon: 'photo_fix',
    label: 'Mejorar contenido',
    tint: 'bg-amber-100 text-amber-800',
  },
  competitor_response: {
    icon: 'crisis_alert',
    label: 'Competencia',
    tint: 'bg-rose-100 text-rose-700',
  },
  news_reaction: {
    icon: 'new_releases',
    label: 'Noticia',
    tint: 'bg-cyan-100 text-cyan-700',
  },
};

const IMPACT_META: Record<
  RecommendationImpact,
  { label: string; className: string }
> = {
  high: { label: 'Alto impacto', className: 'bg-rose-500 text-white' },
  medium: { label: 'Impacto medio', className: 'bg-amber-500 text-white' },
  low: { label: 'Nice to have', className: 'bg-slate-400 text-white' },
};

const SOURCE_ICON: Record<string, string> = {
  news: 'newspaper',
  competitor: 'radar',
  brand: 'workspaces',
  asset: 'image',
  memory: 'psychology',
};

function sourceHref(src: RecommendationSource): string | null {
  if (src.url) return src.url;
  switch (src.type) {
    case 'news':
      return '/news';
    case 'competitor':
      return src.id ? `/memory?tab=competitors&competitor=${src.id}` : '/memory?tab=competitors';
    case 'asset':
      return src.id ? `/content?asset=${src.id}` : '/content';
    case 'memory':
      return '/memory';
    case 'brand':
      return '/memory?tab=brand';
    default:
      return null;
  }
}

interface Props {
  rec: Recommendation;
}

export function RecommendationCard({ rec }: Props) {
  const confirmDialog = useConfirm();
  const navigate = useNavigate();
  const updateStatus = useUpdateRecommendationStatus();
  const addNote = useAddRecommendationNote();
  const delMut = useDeleteRecommendation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!rec.userNotes);
  const [noteDraft, setNoteDraft] = useState(rec.userNotes ?? '');

  const kindMeta = KIND_META[rec.kind] ?? KIND_META.strategy;
  const impactMeta = IMPACT_META[rec.impact] ?? IMPACT_META.medium;

  const payload = useMemo(
    () => (rec.actionPayload ?? {}) as Record<string, unknown>,
    [rec.actionPayload],
  );

  const executeAction = () => {
    switch (rec.actionKind) {
      case 'navigate_image_gen': {
        const prompt = String(payload.prompt ?? rec.title);
        const size = String(payload.size ?? 'square');
        const usePalette = payload.use_brand_palette ? '1' : '0';
        const qs = new URLSearchParams({
          tab: 'generate',
          prompt,
          size,
          usePalette,
        });
        navigate(`/content?${qs.toString()}`);
        break;
      }
      case 'navigate_chat': {
        const qs = new URLSearchParams();
        if (payload.agent_id) qs.set('agent_id', String(payload.agent_id));
        if (payload.initial_message)
          qs.set('initial_message', String(payload.initial_message));
        navigate(`/chat${qs.toString() ? `?${qs.toString()}` : ''}`);
        break;
      }
      case 'create_scheduled_post': {
        const qs = new URLSearchParams({ tab: 'scheduled', create: '1' });
        if (payload.caption) qs.set('caption', String(payload.caption));
        if (payload.scheduled_at_hint)
          qs.set('scheduled_at', String(payload.scheduled_at_hint));
        if (Array.isArray(payload.platforms))
          qs.set('platforms', (payload.platforms as string[]).join(','));
        navigate(`/content?${qs.toString()}`);
        break;
      }
      case 'open_competitor': {
        const cid = payload.competitor_id ? String(payload.competitor_id) : '';
        navigate(`/memory?tab=competitors${cid ? `&competitor=${cid}` : ''}`);
        break;
      }
      case 'generate_report': {
        const type = String(payload.type ?? 'brand_strategy');
        if (type === 'news') {
          const topic = payload.topic ? String(payload.topic) : '';
          navigate(`/news${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`);
        } else {
          navigate(`/reports?generate=${type}`);
        }
        break;
      }
      case 'open_news': {
        const topic = payload.topic ? String(payload.topic) : '';
        navigate(`/news${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`);
        break;
      }
      default:
        navigate('/chat');
    }
    // Mark as in_progress when user engages
    if (rec.status === 'new' || rec.status === 'saved') {
      updateStatus.mutate({
        id: rec.id,
        project_id: rec.projectId,
        status: 'in_progress',
      });
    }
  };

  const isSaved = rec.status === 'saved';
  const isCompleted = rec.status === 'completed';

  return (
    <Card className="p-4 sm:p-6 md:p-7 flex flex-col gap-4 sm:gap-5 relative overflow-hidden">
      {/* Top row: badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider',
              kindMeta.tint,
            )}
          >
            <Icon name={kindMeta.icon} className="text-[14px]" />
            {kindMeta.label}
          </span>
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
              impactMeta.className,
            )}
          >
            {impactMeta.label}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white">
              <Icon name="check" className="text-[14px]" />
              Completada
            </span>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Más opciones"
            className="w-11 h-11 grid place-items-center rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <Icon name="more_horiz" className="text-[20px]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20">
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => {
                  setMenuOpen(false);
                  updateStatus.mutate({
                    id: rec.id,
                    project_id: rec.projectId,
                    status: 'completed',
                  });
                }}
                className="w-full px-4 py-3 min-h-[48px] text-left text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateStatus.isPending ? (
                  <Spinner size="sm" className="mr-1" />
                ) : (
                  <Icon name="check_circle" className="text-[18px] text-emerald-600" />
                )}
                {updateStatus.isPending ? 'Procesando...' : 'Marcar completada'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setNoteOpen((v) => !v);
                }}
                className="w-full px-4 py-3 min-h-[48px] text-left text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"
              >
                <Icon name="edit_note" className="text-[18px] text-slate-500" />
                {noteOpen ? 'Ocultar notas' : 'Añadir notas'}
              </button>
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() => {
                  setMenuOpen(false);
                  updateStatus.mutate({
                    id: rec.id,
                    project_id: rec.projectId,
                    status: 'dismissed',
                  });
                }}
                className="w-full px-4 py-3 min-h-[48px] text-left text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateStatus.isPending ? (
                  <Spinner size="sm" className="mr-1" />
                ) : (
                  <Icon name="do_not_disturb_on" className="text-[18px]" />
                )}
                {updateStatus.isPending ? 'Procesando...' : 'Descartar'}
              </button>
              <button
                type="button"
                disabled={delMut.isPending}
                onClick={async () => {
                  setMenuOpen(false);
                  const ok = await confirmDialog({ title: '¿Eliminar esta recomendación?', variant: 'danger', confirmLabel: 'Eliminar' });
                  if (ok) {
                    delMut.mutate({ id: rec.id, project_id: rec.projectId });
                  }
                }}
                className="w-full px-4 py-3 min-h-[48px] text-left text-sm font-semibold hover:bg-red-50 flex items-center gap-2 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {delMut.isPending ? (
                  <Spinner size="sm" className="mr-1" />
                ) : (
                  <Icon name="delete" className="text-[18px]" />
                )}
                {delMut.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-display font-black text-xl md:text-2xl text-slate-900 leading-tight">
        {rec.title}
      </h3>

      {/* Why */}
      <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-violet-700 mb-2">
          Por qué
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">{rec.why}</p>
      </div>

      {/* Sources */}
      {rec.sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rec.sources.map((s, i) => {
            const href = sourceHref(s);
            const icon = SOURCE_ICON[s.type] ?? 'label';
            const label = s.title ?? s.type;
            const cls =
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors max-w-[240px] truncate';
            return href ? (
              <a
                key={i}
                href={href}
                className={cls}
                onClick={(e) => {
                  if (href.startsWith('/')) {
                    e.preventDefault();
                    navigate(href);
                  }
                }}
              >
                <Icon name={icon} className="text-[14px]" />
                <span className="truncate">{label}</span>
              </a>
            ) : (
              <span key={i} className={cls}>
                <Icon name={icon} className="text-[14px]" />
                <span className="truncate">{label}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button onClick={executeAction} className="flex-1 min-w-0 sm:min-w-[180px] min-h-[48px] sm:min-h-0">
          <Icon name="bolt" className="text-[18px]" />
          {rec.actionLabel}
        </Button>
        <Button
          variant={isSaved ? 'primary' : 'outline'}
          disabled={updateStatus.isPending}
          onClick={() =>
            updateStatus.mutate({
              id: rec.id,
              project_id: rec.projectId,
              status: isSaved ? 'new' : 'saved',
            })
          }
          title={isSaved ? 'Quitar de guardadas' : 'Guardar'}
        >
          {updateStatus.isPending ? (
            <Spinner size="sm" className="mr-1" />
          ) : (
            <Icon name={isSaved ? 'star' : 'star_border'} className="text-[18px]" />
          )}
          {updateStatus.isPending ? 'Procesando...' : isSaved ? 'Guardada' : 'Guardar'}
        </Button>
      </div>

      {/* Notes */}
      {noteOpen && (
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
            Mis notas
          </label>
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            placeholder="¿Qué vas a hacer con esta sugerencia?"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNoteDraft(rec.userNotes ?? '');
                if (!rec.userNotes) setNoteOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() =>
                addNote.mutate({
                  id: rec.id,
                  project_id: rec.projectId,
                  user_notes: noteDraft.trim() ? noteDraft.trim() : null,
                })
              }
              disabled={addNote.isPending}
            >
              {addNote.isPending ? <><Spinner size="sm" className="mr-1" /> Guardando...</> : 'Guardar nota'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
