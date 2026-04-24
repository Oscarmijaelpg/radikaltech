import { useMemo, useState } from 'react';
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
import { NewsResultsGrid } from '../components/NewsResultsGrid';
import { SavedSearchesSidebar } from '../components/SavedSearchesSidebar';

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
  const [topic, setTopic] = useState('');
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);

  const aggregate = useAggregateNews();
  const saved = useSavedNewsReports(activeProject?.id);
  const sira = useSiraContextual();

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
      const res = await aggregate.mutateAsync({
        topic: query,
        project_id: activeProject?.id,
      });
      setItems(res.result.items ?? []);
      setAnalysis(res.result.analysis ?? null);
    } catch {
      setItems([]);
      setAnalysis(null);
    }
  };

  const rerunSaved = (r: SavedReport) => {
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

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
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
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6">
          <aside className="order-2 lg:order-1">
            <SavedSearchesSidebar
              activeProjectId={activeProject?.id}
              saved={savedList}
              isLoading={saved.isLoading}
              currentTopic={currentTopic}
              onSelect={rerunSaved}
            />
          </aside>

          <section className="order-1 lg:order-2 relative min-h-[320px]">
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
          </section>
        </div>
      </div>
    </div>
  );
}
