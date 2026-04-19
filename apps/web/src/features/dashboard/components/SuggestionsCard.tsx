import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Icon } from '@radikal/ui';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import type { Recommendation } from '@/features/recommendations/api/recommendations';

const IMPACT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const TOP_RECS = 3;

interface Props {
  recommendations: Recommendation[] | undefined;
  loading: boolean;
}

export function SuggestionsCard({ recommendations, loading }: Props) {
  const navigate = useNavigate();
  const topRecs = useMemo(() => {
    const list = recommendations ?? [];
    return [...list]
      .sort((a, b) => (IMPACT_RANK[a.impact] ?? 9) - (IMPACT_RANK[b.impact] ?? 9))
      .slice(0, TOP_RECS);
  }, [recommendations]);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 grid place-items-center text-white shadow-md shrink-0">
            <Icon name="tips_and_updates" className="text-[18px] sm:text-[20px]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-black text-sm sm:text-base">Sugerencias</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              Top 3 acciones recomendadas
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/recommendations')}>
          Ver todas
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : topRecs.length === 0 ? (
        <CharacterEmpty
          character="indexa"
          title="Todavía no tengo sugerencias"
          message="Leo tus datos para recomendarte acciones concretas. Dame un par de días de uso o dispara la primera ronda manualmente."
          bullets={[
            'Completa tu identidad de marca',
            'Añade al menos 1 competidor',
            'Yo detecto oportunidades y te las priorizo por impacto',
          ]}
          action={{ label: 'Generar ahora', onClick: () => navigate('/recommendations') }}
        />
      ) : (
        <ul className="space-y-2">
          {topRecs.map((rec) => {
            const impactClass =
              rec.impact === 'high'
                ? 'bg-rose-500'
                : rec.impact === 'medium'
                  ? 'bg-amber-500'
                  : 'bg-slate-400';
            return (
              <li key={rec.id}>
                <button
                  type="button"
                  onClick={() => navigate('/recommendations')}
                  className="w-full text-left p-3 rounded-2xl border border-slate-200 bg-white hover:border-[hsl(var(--color-primary)/0.4)] hover:shadow-sm transition-all flex items-start gap-3"
                >
                  <span
                    className={`shrink-0 mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${impactClass}`}
                  >
                    {rec.impact}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{rec.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{rec.why}</p>
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
