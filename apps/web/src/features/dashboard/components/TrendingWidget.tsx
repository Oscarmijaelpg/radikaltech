import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  SectionTitle,
  Spinner,
} from '@radikal/ui';
import { api } from '@/lib/api';
import { useToast } from '@/shared/ui/Toaster';

export type TrendMomentum = 'rising' | 'peaking' | 'cooling';
export type TrendCategory = 'content' | 'format' | 'topic' | 'tech';

export interface TrendEvidence {
  type: 'news' | 'competitor_post';
  title: string;
  url: string;
}

export interface DetectedTrend {
  name: string;
  category: TrendCategory;
  momentum: TrendMomentum;
  description: string;
  evidence: TrendEvidence[];
  relevance_score: number;
  suggested_action: string;
}

export function useDetectTrends() {
  return useMutation({
    mutationFn: async (input: { project_id: string }) => {
      const r = await api.post<{
        data: { jobId: string; trends: DetectedTrend[] };
      }>('/ai-services/detect-trends', input);
      return r.data;
    },
  });
}

const MOMENTUM_META: Record<TrendMomentum, { label: string; className: string; icon: string }> = {
  rising: { label: 'En alza', className: 'bg-emerald-500', icon: 'trending_up' },
  peaking: { label: 'En pico', className: 'bg-amber-500', icon: 'local_fire_department' },
  cooling: { label: 'Enfriando', className: 'bg-slate-400', icon: 'trending_down' },
};

interface Props {
  projectId: string | null | undefined;
}

export function TrendingWidget({ projectId }: Props) {
  const { toast } = useToast();
  const [trends, setTrends] = useState<DetectedTrend[] | null>(null);
  const detect = useDetectTrends();

  async function handleDetect() {
    if (!projectId) return;
    try {
      const res = await detect.mutateAsync({ project_id: projectId });
      setTrends(res.trends ?? []);
    } catch (err) {
      console.error(err);
      toast({ title: 'No se pudieron detectar tendencias', variant: 'error' });
    }
  }

  async function handleCreateRec(trend: DetectedTrend) {
    if (!projectId) return;
    try {
      await api.post('/recommendations', {
        project_id: projectId,
        kind: 'strategy',
        title: trend.name,
        why: trend.description,
        action_label: 'Actuar sobre tendencia',
        action_kind: 'custom',
        action_payload: { trend },
        impact:
          trend.relevance_score >= 75
            ? 'high'
            : trend.relevance_score >= 50
              ? 'medium'
              : 'low',
        sources: trend.evidence.map((e) => ({
          type: e.type === 'news' ? 'news' : 'competitor',
          title: e.title,
          url: e.url,
        })),
      });
      toast({ title: 'Recomendación creada', variant: 'success' });
    } catch {
      toast({ title: 'No se pudo crear la recomendación', variant: 'error' });
    }
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center text-white shadow-md shrink-0">
            <Icon name="local_fire_department" className="text-[18px] sm:text-[20px]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-black text-base sm:text-lg">Tendencias en tu sector</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              Noticias recientes + formatos virales de competidores
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto shrink-0"
          onClick={handleDetect}
          disabled={!projectId || detect.isPending}
        >
          {detect.isPending ? (
            <>
              <Spinner className="w-4 h-4" />
              Analizando…
            </>
          ) : (
            <>
              <Icon name="bolt" className="text-[16px]" />
              Detectar ahora
            </>
          )}
        </Button>
      </div>

      {detect.isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 sm:h-36 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : trends === null ? (
        <EmptyState
          icon={<Icon name="insights" className="text-[28px]" />}
          title="Aún no has detectado tendencias"
          description="Cruzamos noticias de los últimos 7 días con los posts virales de tus competidores."
          action={
            projectId ? (
              <Button onClick={handleDetect}>
                <Icon name="bolt" className="text-[18px]" />
                Detectar ahora
              </Button>
            ) : undefined
          }
        />
      ) : trends.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          No encontramos tendencias claras en este momento.
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {trends.slice(0, 6).map((t, i) => {
            const meta = MOMENTUM_META[t.momentum];
            return (
              <li
                key={i}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white flex flex-col gap-1.5 sm:gap-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${meta.className}`}
                  >
                    <Icon name={meta.icon} className="text-[12px]" />
                    {meta.label}
                  </span>
                  <SectionTitle as="span" className="text-slate-400">
                    {t.category}
                  </SectionTitle>
                  <span className="ml-auto text-[11px] font-bold text-slate-500">
                    {t.relevance_score}/100
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-600 line-clamp-3">{t.description}</p>
                {t.suggested_action && (
                  <p className="text-[11px] text-slate-500 italic line-clamp-2">
                    Acción: {t.suggested_action}
                  </p>
                )}
                <div className="mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateRec(t)}
                  >
                    <Icon name="add" className="text-[14px]" />
                    Crear recomendación
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
