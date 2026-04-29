import { useMemo, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  SectionTitle,
  Skeleton,
} from '@radikal/ui';
import {
  useCompetitorBenchmark,
  useCompetitorGaps,
  useSyncSocialProject,
  type BrandSnapshot,
  type CompetitorSnapshot,
} from '../api/memory';

interface Props {
  projectId: string;
}

const POSITION_META: Record<
  'leader' | 'strong' | 'developing' | 'behind',
  { label: string; classes: string; icon: string }
> = {
  leader: {
    label: 'Líder',
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: 'emoji_events',
  },
  strong: {
    label: 'Posición fuerte',
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
    icon: 'trending_up',
  },
  developing: {
    label: 'En desarrollo',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'auto_graph',
  },
  behind: {
    label: 'Por detrás',
    classes: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: 'trending_down',
  },
};

const METRIC_DEFINITIONS = [
  {
    key: 'engagement',
    label: 'Engagement',
    icon: 'favorite',
    desc: 'Score de compromiso basado en likes y comentarios.',
    color: 'text-rose-500 bg-rose-50',
  },
  {
    key: 'frequency',
    label: 'Frecuencia',
    icon: 'calendar_month',
    desc: 'Promedio de publicaciones realizadas por semana.',
    color: 'text-blue-500 bg-blue-50',
  },
  {
    key: 'variety',
    label: 'Variedad',
    icon: 'category',
    desc: 'Diversidad en el uso de formatos (Reels, Carruseles, Imágenes).',
    color: 'text-amber-500 bg-amber-50',
  },
  {
    key: 'interaction',
    label: 'Interacción',
    icon: 'chat_bubble',
    desc: 'Volumen promedio de comentarios por publicación.',
    color: 'text-emerald-500 bg-emerald-50',
  },
  {
    key: 'video',
    label: 'Alcance Video',
    icon: 'play_circle',
    desc: 'Rendimiento promedio de visualizaciones en videos.',
    color: 'text-violet-500 bg-violet-50',
  },
];

function fmtNum(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

function RatioArrow({ ratio }: { ratio: number }) {
  if (!isFinite(ratio)) return null;
  const up = ratio >= 1;
  const color = up ? 'text-emerald-600' : 'text-rose-600';
  const arrow = up ? '↑' : '↓';
  const pct = Math.abs((ratio - 1) * 100);
  return (
    <span className={`${color} text-xs font-semibold`}>
      {arrow} {pct.toFixed(0)}%
    </span>
  );
}

function radarData(
  my: BrandSnapshot,
  comp: CompetitorSnapshot | null,
): Array<{ dimension: string; tu: number; competidor: number }> {
  const normalize = (a: number, b: number): [number, number] => {
    const max = Math.max(a, b, 1);
    return [Math.round((a / max) * 100), Math.round((b / max) * 100)];
  };
  const [eng_t, eng_c] = normalize(my.engagement_score, comp?.engagement_score ?? 0);
  const [freq_t, freq_c] = normalize(my.posts_per_week, comp?.posts_per_week ?? 0);
  const myFormats = Object.keys(my.format_mix).length;
  const compFormats = comp ? Object.keys(comp.format_mix).length : 0;
  const [var_t, var_c] = normalize(myFormats, compFormats);
  const [plat_t, plat_c] = normalize(my.avg_comments, comp?.avg_comments ?? 0);
  const [gr_t, gr_c] = normalize(my.avg_views, comp?.avg_views ?? 0);
  return [
    { dimension: 'Engagement', tu: eng_t, competidor: eng_c },
    { dimension: 'Frecuencia', tu: freq_t, competidor: freq_c },
    { dimension: 'Variedad', tu: var_t, competidor: var_c },
    { dimension: 'Interacción', tu: plat_t, competidor: plat_c },
    { dimension: 'Alcance Video', tu: gr_t, competidor: gr_c },
  ];
}

export function CompetitorsBenchmarkTab({ projectId }: Props) {
  const { data: benchmark, isLoading, refetch } = useCompetitorBenchmark(projectId);
  const { data: gaps, isLoading: loadingGaps } = useCompetitorGaps(projectId);
  const { mutate: syncBrand, isPending: isSyncing } = useSyncSocialProject();
  const navigate = useNavigate();

  const handleSyncBrand = () => {
    syncBrand(projectId, {
      onSuccess: () => {
        // Podríamos mostrar un toast aquí
        setTimeout(() => refetch(), 2000);
      }
    });
  };

  const topComps = useMemo(() => benchmark?.competitors.slice(0, 5) ?? [], [benchmark]);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!benchmark) return null;
    if (selectedComp) return benchmark.competitors.find((c) => c.id === selectedComp) ?? null;
    return benchmark.competitors[0] ?? null;
  }, [benchmark, selectedComp]);

  if (isLoading) return <Skeleton className="h-96" />;
  if (!benchmark) {
    return (
      <Card>
        <EmptyState
          icon={<Icon name="analytics" className="text-[32px]" />}
          title="Sin datos para benchmark"
          description="Analiza algunos competidores para generar el benchmark comparativo."
        />
      </Card>
    );
  }

  const pos = POSITION_META[benchmark.overall_position];
  const { my_brand } = benchmark;

  return (
    <div className="space-y-6">
      {/* Posición actual */}
      <Card className="p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-200">
        <div className="flex items-start gap-3 sm:gap-4">
          <Icon name={pos.icon} className="text-violet-600 text-[28px] sm:text-[36px] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <SectionTitle>
                Tu posición actual
              </SectionTitle>
              <Badge className={`${pos.classes} border text-xs`}>{pos.label}</Badge>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed break-words">
              {benchmark.summary}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabla comparativa */}
      <div>
        <h3 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
          <Icon name="table_chart" className="text-violet-600" />
          Comparativa vs Top 5
        </h3>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="p-3 font-bold">Marca</th>
                  <th className="p-3 font-bold text-right">Posts</th>
                  <th className="p-3 font-bold text-right">Likes prom</th>
                  <th className="p-3 font-bold text-right">Comments prom</th>
                  <th className="p-3 font-bold text-right">Frec (sem)</th>
                  <th className="p-3 font-bold">Mejor plataforma</th>
                  <th className="p-3 font-bold">Veredicto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-violet-50 border-b border-violet-100">
                  <td className="p-3 font-bold text-violet-900">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-600" />
                      {my_brand.name}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold">{fmtNum(my_brand.social_posts_count)}</td>
                  <td className="p-3 text-right">{fmtNum(my_brand.avg_likes)}</td>
                  <td className="p-3 text-right">{fmtNum(my_brand.avg_comments)}</td>
                  <td className="p-3 text-right">{fmtNum(my_brand.posts_per_week)}</td>
                  <td className="p-3 text-xs text-slate-600">{my_brand.best_performing_platform ?? '—'}</td>
                  <td className="p-3 text-right">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-violet-600 h-8 text-[11px] font-bold uppercase gap-1"
                      onClick={handleSyncBrand}
                      disabled={isSyncing}
                    >
                      <Icon name={isSyncing ? 'sync' : 'refresh'} className={`text-sm ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando...' : my_brand.social_posts_count === 0 ? 'Sincronizar mi marca' : 'Actualizar'}
                    </Button>
                  </td>
                </tr>
                {topComps.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-semibold text-slate-900 truncate max-w-[200px]">{c.name}</td>
                    <td className="p-3 text-right">{fmtNum(c.social_posts_count)}</td>
                    <td className="p-3 text-right">
                      <div>{fmtNum(c.avg_likes)}</div>
                    </td>
                    <td className="p-3 text-right">{fmtNum(c.avg_comments)}</td>
                    <td className="p-3 text-right">
                      <div>{fmtNum(c.posts_per_week)}</div>
                      <RatioArrow ratio={c.my_vs_them.frequency_ratio} />
                    </td>
                    <td className="p-3 text-xs text-slate-600">{c.best_performing_platform ?? '—'}</td>
                    <td className="p-3">
                      <Badge
                        className={`border text-[10px] uppercase ${
                          c.my_vs_them.verdict === 'ahead'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : c.my_vs_them.verdict === 'behind'
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {c.my_vs_them.verdict === 'ahead' ? 'ventaja' : c.my_vs_them.verdict === 'behind' ? 'atrás' : 'paridad'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {topComps.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-slate-500 text-sm" colSpan={7}>
                      Aún no hay competidores analizados para comparar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Radar chart */}
      {selected && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Icon name="radar" className="text-violet-600" />
              Benchmark multidimensional
            </h3>
            <select
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
              value={selected.id}
              onChange={(e) => setSelectedComp(e.target.value)}
            >
              {benchmark.competitors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData(my_brand, selected)}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Tu marca"
                  dataKey="tu"
                  stroke="hsl(280, 67%, 55%)"
                  fill="hsl(280, 67%, 55%)"
                  fillOpacity={0.45}
                />
                <Radar
                  name={selected.name}
                  dataKey="competidor"
                  stroke="hsl(14, 89%, 55%)"
                  fill="hsl(14, 89%, 55%)"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
          
          {/* Glosario de métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
            {METRIC_DEFINITIONS.map((m) => (
              <div key={m.key} className="p-3 rounded-xl border border-slate-100 bg-white/50 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${m.color} flex items-center justify-center`}>
                    <Icon name={m.icon} className="text-sm" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{m.label}</span>
                </div>
                <p className="text-[10px] leading-tight text-slate-500">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps / oportunidades */}
      <div>
        <h3 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
          <Icon name="lightbulb" className="text-amber-600" />
          Oportunidades detectadas
        </h3>
        {loadingGaps ? (
          <Skeleton className="h-40" />
        ) : !gaps ||
          (gaps.content_gaps.length === 0 &&
            gaps.temporal_gaps.length === 0 &&
            gaps.theme_gaps.length === 0) ? (
          <Card className="p-6 text-center text-sm text-slate-500">
            No se detectaron gaps significativos por ahora.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gaps.content_gaps.slice(0, 4).map((g) => (
              <Card key={`fmt-${g.format}`} className="p-4 border-amber-200 bg-amber-50/40">
                <div className="flex items-start gap-2 mb-2">
                  <Icon name="warning" className="text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900">
                      Formato: <span className="capitalize">{g.format}</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Usado por {g.competitors_using.length} competidor{g.competitors_using.length !== 1 ? 'es' : ''}. Tú lo usas {g.my_usage} veces.
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-[10px]">
                    {g.opportunity_score}/10
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/recommendations')}
                  className="w-full"
                >
                  Generar contenido para esto
                </Button>
              </Card>
            ))}
            {gaps.temporal_gaps.slice(0, 3).map((g) => (
              <Card key={`day-${g.weekday}`} className="p-4 border-amber-200 bg-amber-50/40">
                <div className="flex items-start gap-2 mb-2">
                  <Icon name="calendar_today" className="text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 capitalize">{g.weekday}</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {g.competitors_active} competidores activos este día y tú no publicas.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/content')} className="w-full">
                  Programar contenido
                </Button>
              </Card>
            ))}
            {gaps.theme_gaps.length > 0 && (
              <Card className="p-4 border-amber-200 bg-amber-50/40 sm:col-span-2">
                <div className="flex items-start gap-2 mb-2">
                  <Icon name="topic" className="text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900">Temas sin explorar</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Tus competidores hablan de estos temas y tú aún no.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                  {gaps.theme_gaps.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-white border border-amber-200 text-[11px] font-semibold text-amber-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/recommendations')}>
                  Generar contenido para esto
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
