import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  SectionTitle,
  Spinner,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import {
  useAggregateNews,
  useSavedNewsReports,
  type NewsAnalysis,
  type NewsItem,
  type SavedReport,
} from '../api/news';
import { useSiraContextual } from '@/features/sira-contextual';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { HelpButton } from '@/shared/ui/HelpButton';
import { AnalysisSubnav } from '@/shared/ui/AnalysisSubnav';
import { cn } from '@/shared/utils/cn';
import { NewsResultsGrid } from '../components/NewsResultsGrid';
import { SavedSearchesSidebar } from '../components/SavedSearchesSidebar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/shared/ui/Toaster';
import { CHARACTERS } from '@/shared/characters';
import { repairMarkdownTable } from '@/shared/utils';
import { markdownComponents } from '@/features/reports/components/reader/markdown';

function parseReportItems(r: SavedReport): NewsItem[] {
  try {
    if (Array.isArray(r.sourceData)) return r.sourceData as NewsItem[];
    if (r.content) {
      const parsed = JSON.parse(r.content);
      if (Array.isArray(parsed)) return parsed as NewsItem[];
    }
  } catch {
    /* noop */
  }
  return [];
}

export function NewsPage() {
  const { activeProject } = useProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);
  const [view, setView] = useState<'search' | 'diagnostic'>('diagnostic');
  const [refreshing, setRefreshing] = useState(false);

  const aggregate = useAggregateNews();
  const saved = useSavedNewsReports(activeProject?.id);
  const sira = useSiraContextual();

  const hasSeenJob = useRef(false);

  // Polling para Jobs de noticias
  const { data: activeJobs } = useQuery({
    queryKey: ['active-jobs', 'news', activeProject?.id],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>(`/jobs/active?project_id=${activeProject?.id}`);
      return res.data || [];
    },
    enabled: !!activeProject?.id,
    refetchInterval: (query) => {
      const hasNewsJob = query.state.data?.some((j: any) => j.kind === 'news-refresh');
      return hasNewsJob ? 3000 : 15000;
    },
  });

  const newsJob = useMemo(() =>
    activeJobs?.find((j: any) => j.kind === 'news-refresh' && (j.status === 'running' || j.status === 'queued')),
    [activeJobs]);

  useEffect(() => {
    if (newsJob) {
      hasSeenJob.current = true;
    }

    if (refreshing && hasSeenJob.current && !newsJob) {
      setRefreshing(false);
      hasSeenJob.current = false;
      queryClient.invalidateQueries({ queryKey: ['reports', 'news', activeProject?.id] });
      toast({
        title: 'Noticias Actualizadas',
        description: 'Sira ha terminado de rastrear el sector.',
        variant: 'success',
      });
    }
  }, [newsJob, refreshing, activeProject?.id, queryClient, toast]);

  const handleRefresh = async () => {
    if (!activeProject?.id || refreshing || newsJob) return;
    setRefreshing(true);
    hasSeenJob.current = false; // Reset al iniciar
    try {
      await api.post('/ai/refresh-news-report', { project_id: activeProject.id });
      toast({
        title: 'Actualización iniciada',
        description: 'Sira está analizando las tendencias del sector. Recibirás una notificación cuando el reporte McKinsey esté listo.',
        variant: 'success'
      });
    } catch (err) {
      setRefreshing(false);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la búsqueda de noticias.',
        variant: 'error',
      });
    }
  };

  const stepMessages: Record<string, string> = {
    'initializing': 'Iniciando investigación...',
    'generating-prompt': 'Analizando contexto de marca...',
    'searching-kimi': 'Rastreando noticias en la web (2025-2026)...',
    'saving-report': 'Redactando reporte estratégico...',
    'completed': '¡Todo listo!'
  };

  const currentStep = (newsJob?.metadata as any)?.step || 'searching-kimi';

  const askSiraAbout = (item: NewsItem) => {
    sira.openWith({
      kind: 'news',
      id: item.url,
      title: item.title,
      data: { item, topic: currentTopic },
    });
  };

  const onSearch = async (q: string) => {
    const query = q.trim();
    if (!query) return;
    setCurrentTopic(query);
    setItems([]);
    setAnalysis(null);
    try {
      const res = (await aggregate.mutateAsync({
        topic: query,
        project_id: activeProject?.id,
      })) as any;
      setItems(res.result.items ?? []);
      setAnalysis(res.result.analysis ?? null);
    } catch {
      setItems([]);
      setAnalysis(null);
    }
  };

  const rerunSaved = (r: SavedReport) => {
    setView('search');
    const t = r.title.replace(/^Noticias:\s*/i, '').trim() || r.title;
    setTopic(t);
    // Show cached results immediately and also trigger a fresh search
    const cached = parseReportItems(r);
    if (cached.length) {
      setCurrentTopic(t);
      setItems(cached);
    }
    void onSearch(t);
  };

  const hasItems = items.length > 0;
  const hasNarrative = !!analysis?.narrative || !!analysis?.executive_summary;
  const hasResults = hasItems || hasNarrative;
  const loading = aggregate.isPending;

  const savedList = useMemo(() => saved.data ?? [], [saved.data]);
  const otherReports = useMemo(() => savedList.filter(r =>
    r.title !== 'Reporte Inicial de Noticias' &&
    (r.sourceData as any)?.pipeline !== 'initial-intelligence-news'
  ), [savedList]);

  const initialReport = useMemo(() => savedList.find(r =>
    r.title === 'Reporte Inicial de Noticias' ||
    (r.sourceData as any)?.pipeline === 'initial-intelligence-news'
  ), [savedList]);

  const showSidebar = view === 'search' || otherReports.length > 0;

  return (
    <div className="min-h-full bg-gradient-to-br from-cyan-50/40 via-white to-blue-50/40">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <AnalysisSubnav />
        <header className="mb-6 md:mb-8 relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-cyan-500 to-blue-600 p-6 md:p-10 text-white shadow-2xl">
          <div className="absolute top-4 right-4 z-20">
            <HelpButton
              title="Noticias"
              description="Busca noticias sobre tu sector. La IA las analiza y te dice cuáles son relevantes para tu marca."
              tips={[
                'Describe el tema con detalle para mejores resultados.',
                'Los resultados se guardan como reportes de noticias.',
                'Pregúntale a Sira sobre cualquier noticia con un click.',
              ]}
            />
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10">
            <SectionTitle className="opacity-80 text-white mb-2">
              Monitoreo inteligente
            </SectionTitle>
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">
              Noticias
            </h1>
            <p className="text-white/80 mt-3 text-base md:text-lg max-w-2xl">
              Sira rastrea las noticias más relevantes de los últimos 14 días para mantenerte al día
              sobre lo que importa a tu marca.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-4 items-center">
              <div className="inline-flex p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <button
                  onClick={() => setView('diagnostic')}
                  className={cn(
                    'px-6 py-2.5 rounded-xl text-sm font-bold transition-all',
                    view === 'diagnostic' ? 'bg-white text-cyan-700 shadow-lg' : 'text-white/70 hover:text-white',
                  )}
                >
                  Diagnóstico del Sector
                </button>
                <button
                  onClick={() => setView('search')}
                  className={cn(
                    'px-6 py-2.5 rounded-xl text-sm font-bold transition-all',
                    view === 'search' ? 'bg-white text-cyan-700 shadow-lg' : 'text-white/70 hover:text-white',
                  )}
                >
                  Búsqueda Manual
                </button>
              </div>

              {view === 'diagnostic' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || !!newsJob}
                  className="rounded-xl border-white/40 text-white hover:bg-white/10 relative z-10 h-11"
                >
                  <Icon
                    name="refresh"
                    className={cn("mr-2", (refreshing || !!newsJob) && "animate-spin")}
                  />
                  {refreshing || !!newsJob ? 'Actualizando...' : 'Actualizar análisis'}
                </Button>
              )}

              {view === 'search' && (
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void onSearch(topic);
                    }}
                    placeholder="¿Qué te interesa monitorear? Ej. Tendencias IA 2026"
                    className="flex-1 min-w-0 !bg-white/95 !text-slate-900 placeholder:text-slate-400 h-14 text-base"
                  />
                  <Button
                    onClick={() => void onSearch(topic)}
                    disabled={!topic.trim() || loading}
                    className="h-14 px-8 bg-white !text-cyan-700 hover:bg-white/90"
                  >
                    <Icon name="search" className="text-[20px]" />
                    Buscar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={cn(
          "grid grid-cols-1 gap-4 sm:gap-6",
          showSidebar ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1"
        )}>
          {showSidebar && (
            <aside className="order-2 lg:order-1">
              <SavedSearchesSidebar
                activeProjectId={activeProject?.id}
                saved={otherReports}
                isLoading={saved.isLoading}
                currentTopic={currentTopic}
                onSelect={rerunSaved}
              />
            </aside>
          )}

          <section className={cn(
            "relative min-h-[320px] flex flex-col gap-6",
            showSidebar ? "order-1 lg:order-2" : "order-1"
          )}>
            {view === 'diagnostic' && (
              <>
                {refreshing || !!newsJob ? (
                  <Card className="p-12 flex flex-col items-center justify-center text-center space-y-6 bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-inner">
                    <div className="w-32 h-32 rounded-[32px] bg-gradient-to-br from-cyan-400 to-blue-500 p-[3px] animate-pulse">
                      <div className="w-full h-full rounded-[29px] bg-white overflow-hidden grid place-items-center">
                        <img src={CHARACTERS.sira.image} alt="Sira" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="max-w-md">
                      <h3 className="text-2xl font-display font-black text-slate-900 mb-2">Buscando información actualizada</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Sira está analizando las tendencias más relevantes de tu industria para 2025-2026.
                        Este proceso puede tardar un par de minutos mientras navega por la web.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm bg-cyan-50 px-4 py-2 rounded-full border border-cyan-100">
                      <Icon name="refresh" className="animate-spin text-lg" />
                      {stepMessages[currentStep] || 'Analizando noticias sectoriales...'}
                    </div>
                  </Card>
                ) : initialReport ? (
                  <Card className="p-8 sm:p-12 bg-gradient-to-br from-white to-blue-50/50 shadow-xl border-blue-100/50 rounded-[32px]">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-700 grid place-items-center">
                          <Icon name="history_edu" className="text-[32px]" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-display font-black text-slate-900">Análisis del Sector</h3>
                          <p className="text-sm text-slate-500">Reporte estratégico generado por la IA</p>
                        </div>
                      </div>
                    </div>
                    <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          ...markdownComponents,
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline font-semibold" />
                          ),
                          code: ({ node, inline, className, children, ...props }: any) => {
                            if (inline) {
                              return <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 text-[0.9em] font-mono" {...props}>{children}</code>;
                            }
                            return (
                              <div className="my-8 overflow-x-auto rounded-3xl border border-slate-200/60 bg-slate-50/50 p-8 shadow-[inner_0_2px_4px_rgba(0,0,0,0.02)]">
                                <code className="text-sm font-mono text-slate-600 leading-relaxed block whitespace-pre" {...props}>
                                  {children}
                                </code>
                              </div>
                            );
                          },
                        }}
                      >
                        {repairMarkdownTable(initialReport.content || 'Reporte vacío.')}
                      </ReactMarkdown>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-12 text-center">
                    <CharacterEmpty
                      character="sira"
                      title="Aún no hay análisis inicial"
                      message="Presiona el botón de actualizar o completa el onboarding para que Sira analice tu industria."
                    />
                    <div className="mt-6">
                      <Button onClick={handleRefresh}>
                        Generar Análisis Inicial
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            )}

            {view === 'search' && (
              <>
                {loading && (
                  <div className="absolute inset-0 z-20 rounded-3xl bg-white/70 backdrop-blur-sm grid place-items-center">
                    <div className="flex flex-col items-center gap-4 text-center px-6">
                      <Spinner size="lg" />
                      <p className="font-display font-semibold text-slate-700">
                        Sira está buscando las noticias más relevantes...
                      </p>
                      {currentTopic && (
                        <p className="text-xs text-slate-500">Tema: {currentTopic}</p>
                      )}
                    </div>
                  </div>
                )}

                {!loading && !hasResults && !currentTopic && (
                  <Card className="p-6">
                    <CharacterEmpty
                      character="sira"
                      title="Dime qué tema monitorear"
                      message="Yo rastreo el mundo por ti. Escribe un tema y te traigo las noticias más recientes de los últimos 14 días."
                    />
                  </Card>
                )}

                {!loading && currentTopic && !hasResults && (
                  <Card>
                    <EmptyState
                      icon={<Icon name="search_off" className="text-[32px]" />}
                      title="Sin resultados"
                      description={`No encontramos noticias recientes para "${currentTopic}". Prueba con otros términos.`}
                    />
                  </Card>
                )}

                {hasResults && (
                  <div className="space-y-4">
                    {hasNarrative && (
                      <Card className="p-5 bg-gradient-to-br from-cyan-50/60 to-blue-50/60 border-cyan-100">
                        {analysis?.executive_summary && (
                          <p className="text-sm font-semibold text-cyan-900 mb-3 leading-relaxed">
                            {analysis.executive_summary}
                          </p>
                        )}
                        {analysis?.key_insights && analysis.key_insights.length > 0 && (
                          <ul className="space-y-1.5 mb-1">
                            {analysis.key_insights.map((insight, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <Icon
                                  name="insights"
                                  className="text-cyan-500 text-[16px] mt-0.5 shrink-0"
                                />
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Card>
                    )}
                    {hasItems && (
                      <NewsResultsGrid
                        items={items}
                        currentTopic={currentTopic}
                        onAskSira={askSiraAbout}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
