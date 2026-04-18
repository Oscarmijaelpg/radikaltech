import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SectionTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@radikal/ui';
import {
  useCreateMemory,
  useCompetitorPosts,
  useCompetitorStats,
  type CompetitorAnalysisResult,
  type SocialPostItem,
  type VisualAnalysisPayload,
} from '../api/memory';
import { CompetitionCharts } from './CompetitionCharts';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  competitorId?: string | null;
  competitorName: string;
  result: CompetitorAnalysisResult | null;
}

function fmtNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (v >= 1000) return v.toLocaleString('es-ES', { maximumFractionDigits: 0 });
  return v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function KpiCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined text-[28px] text-[hsl(var(--color-primary))]"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <SectionTitle className="text-slate-400">{label}</SectionTitle>
          <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function PostCard({ post }: { post: SocialPostItem }) {
  const [showVisual, setShowVisual] = useState(false);
  const va = post.visual_analysis ?? null;
  return (
    <div className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-white flex flex-col">
      <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square bg-slate-100">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">sin imagen</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2">
          <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] uppercase tracking-widest font-black">
            Abrir post
          </span>
        </div>
      </a>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs text-slate-700 line-clamp-2 min-h-[32px]">{post.caption ?? '—'}</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{post.platform}</Badge>
          <Badge variant="secondary">♥ {fmtNumber(post.likes)}</Badge>
          <Badge variant="secondary">💬 {fmtNumber(post.comments)}</Badge>
        </div>
        {va && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVisual((v) => !v)}
              className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))] hover:underline"
            >
              {showVisual ? 'Ocultar' : 'Análisis visual'}
            </button>
            {showVisual && (
              <div className="mt-2 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                {va.description && <p className="text-xs text-slate-700">{va.description}</p>}
                {va.dominant_colors && va.dominant_colors.length > 0 && (
                  <div className="flex gap-1">
                    {va.dominant_colors.map((c, i) => (
                      <span
                        key={i}
                        title={c}
                        className="w-5 h-5 rounded-md border border-slate-300"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
                {va.style_tags && va.style_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {va.style_tags.map((t, i) => (
                      <Badge key={i} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CompetitorAnalysisDialog({
  open,
  onOpenChange,
  projectId,
  competitorId,
  competitorName,
  result,
}: Props) {
  const createMemory = useCreateMemory();
  const { data: posts } = useCompetitorPosts(competitorId ?? null, { limit: 30 });
  const { data: stats } = useCompetitorStats(competitorId ?? null);

  const engagement = stats?.engagement_stats ?? null;

  const aesthetic = useMemo(() => {
    const withVa = (posts ?? []).filter((p): p is SocialPostItem & { visual_analysis: VisualAnalysisPayload } =>
      Boolean(p.visual_analysis),
    );
    if (withVa.length === 0) return null;
    const colorCount: Record<string, number> = {};
    const tagCount: Record<string, number> = {};
    const descriptions: string[] = [];
    for (const p of withVa) {
      const va = p.visual_analysis;
      for (const c of va.dominant_colors ?? []) {
        const key = c.toUpperCase();
        colorCount[key] = (colorCount[key] ?? 0) + 1;
      }
      for (const t of va.style_tags ?? []) {
        const key = t.toLowerCase();
        tagCount[key] = (tagCount[key] ?? 0) + 1;
      }
      if (va.description) descriptions.push(va.description);
    }
    const topColors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([c]) => c);
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([t, n]) => ({ tag: t, count: n }));
    return { topColors, topTags, descriptions: descriptions.slice(0, 5), total: withVa.length };
  }, [posts]);

  const save = async () => {
    if (!result) return;
    await createMemory.mutateAsync({
      project_id: projectId,
      category: 'competitor_analysis',
      key: `Análisis: ${competitorName}`,
      value: result.insights.join('\n') || `Análisis de ${competitorName}`,
      metadata: { analysis: result, competitor_name: competitorName },
    });
    onOpenChange(false);
  };

  const bestHourLabel =
    engagement?.best_hour !== null && engagement?.best_hour !== undefined
      ? `${String(engagement.best_hour).padStart(2, '0')}:00`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] sm:max-w-5xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Análisis de {competitorName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="analysis">
          <TabsList className="flex overflow-x-auto scrollbar-hide max-w-full flex-nowrap">
            <TabsTrigger value="analysis" className="shrink-0">Análisis</TabsTrigger>
            <TabsTrigger value="charts" disabled={!competitorId} className="shrink-0">
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="posts" disabled={!competitorId} className="shrink-0">
              Últimos posts
            </TabsTrigger>
            <TabsTrigger value="aesthetic" disabled={!competitorId || !aesthetic} className="shrink-0">
              Estética visual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis">
            {!result ? (
              <p className="text-sm text-slate-500">Aún no hay análisis de mercado.</p>
            ) : (
              <div className="space-y-6">
                <section>
                  <SectionTitle as="h3" className="mb-2">
                    Consulta usada
                  </SectionTitle>
                  <p className="text-sm text-slate-700">{result.query}</p>
                </section>

                <section>
                  <SectionTitle as="h3" className="mb-3">
                    Competidores detectados por Sira
                  </SectionTitle>
                  {result.competitors.length === 0 ? (
                    <p className="text-sm text-slate-500">No se encontraron competidores.</p>
                  ) : (
                    <div className="space-y-3">
                      {result.competitors.map((c, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{c.name}</h4>
                            {c.url && (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[hsl(var(--color-primary))] hover:underline truncate max-w-[40%]"
                              >
                                {c.url}
                              </a>
                            )}
                          </div>
                          {c.summary && <p className="text-sm text-slate-600 mb-3">{c.summary}</p>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {c.strengths && c.strengths.length > 0 && (
                              <div>
                                <SectionTitle className="text-emerald-600 mb-1">
                                  Fortalezas
                                </SectionTitle>
                                <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                                  {c.strengths.map((s, j) => (
                                    <li key={j}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {c.weaknesses && c.weaknesses.length > 0 && (
                              <div>
                                <SectionTitle className="text-red-500 mb-1">
                                  Debilidades
                                </SectionTitle>
                                <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                                  {c.weaknesses.map((s, j) => (
                                    <li key={j}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <SectionTitle as="h3" className="mb-2">
                    Insights estratégicos
                  </SectionTitle>
                  {result.insights.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin insights.</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.insights.map((ins, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700">
                          <Badge variant="primary">{i + 1}</Badge>
                          <span className="flex-1">{ins}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </TabsContent>

          <TabsContent value="charts">
            {competitorId && (
              <div className="space-y-4">
                {!engagement || engagement.total_posts === 0 ? (
                  <NoSocialDataEmpty competitorName={competitorName} />
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <KpiCard icon="photo_library" label="Total posts" value={fmtNumber(engagement.total_posts)} />
                      <KpiCard
                        icon="bolt"
                        label="Engagement prom."
                        value={fmtNumber(engagement.avg_engagement)}
                      />
                      <KpiCard
                        icon="calendar_month"
                        label="Posts/semana"
                        value={fmtNumber(engagement.posts_per_week)}
                      />
                      <KpiCard
                        icon="event_available"
                        label="Mejor día"
                        value={
                          engagement.best_day
                            ? `${engagement.best_day}${bestHourLabel ? ` · ${bestHourLabel}` : ''}`
                            : '—'
                        }
                      />
                    </div>
                    <CompetitionCharts projectId={projectId} competitorIds={[competitorId]} />
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts">
            {!posts || posts.length === 0 ? (
              <NoSocialDataEmpty competitorName={competitorName} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="aesthetic">
            {!aesthetic ? (
              <p className="text-sm text-slate-500">
                Aún no hay análisis visual. Ejecuta un scrape para generar estética visual automática.
              </p>
            ) : (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">
                    La estética de {competitorName}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Basado en {aesthetic.total} posts analizados automáticamente.
                  </p>
                  {aesthetic.descriptions.length > 0 && (
                    <ul className="space-y-2">
                      {aesthetic.descriptions.map((d, i) => (
                        <li key={i} className="text-sm text-slate-700 border-l-2 border-slate-200 pl-3">
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <SectionTitle as="h3" className="mb-2">
                    Colores dominantes
                  </SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {aesthetic.topColors.map((c, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span
                          className="w-12 h-12 rounded-xl border border-slate-300"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                        <span className="text-[10px] font-mono text-slate-500">{c}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <SectionTitle as="h3" className="mb-2">
                    Style tags frecuentes
                  </SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {aesthetic.topTags.map(({ tag, count }, i) => (
                      <Badge key={i} variant="secondary">
                        {tag} · {count}
                      </Badge>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {result && (
            <Button onClick={save} disabled={createMemory.isPending}>
              <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
              Guardar en Memoria
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoSocialDataEmpty({ competitorName }: { competitorName: string }) {
  return (
    <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-center">
      <span className="material-symbols-outlined text-[40px] text-slate-400 mb-3 block">
        query_stats
      </span>
      <h4 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
        Aún no hay datos sociales de {competitorName}
      </h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
        Para ver gráficos, posts y estética necesitamos scrapear su Instagram o TikTok.
        Intenta:
      </p>
      <ul className="text-sm text-left text-slate-600 dark:text-slate-300 max-w-md mx-auto space-y-1.5 list-disc pl-5">
        <li>
          Edita el competidor y añade el URL de su Instagram o TikTok manualmente.
        </li>
        <li>
          O ejecuta el análisis de nuevo — intentaremos descubrir sus redes
          automáticamente desde su sitio web.
        </li>
      </ul>
    </div>
  );
}
