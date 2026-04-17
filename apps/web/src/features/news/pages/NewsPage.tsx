import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, Input, Button, Badge, Spinner, Skeleton } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { cn } from '@/shared/utils/cn';
import {
  useAggregateNews,
  useSavedNewsReports,
  type NewsItem,
  type SavedReport,
} from '../api/news';
import { useSiraContextual } from '@/features/sira-contextual';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { HelpButton } from '@/shared/ui/HelpButton';
import { AnalysisSubnav } from '@/shared/ui/AnalysisSubnav';

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

function relativeDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return formatDistanceToNow(d, { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

export function NewsPage() {
  const { activeProject } = useProject();
  const [topic, setTopic] = useState('');
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [items, setItems] = useState<NewsItem[]>([]);

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
    try {
      const res = await aggregate.mutateAsync({
        topic: query,
        project_id: activeProject?.id,
      });
      setItems(res.result.items);
    } catch {
      setItems([]);
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

  const hasResults = items.length > 0;
  const loading = aggregate.isPending;

  const savedList = useMemo(() => saved.data ?? [], [saved.data]);

  return (
    <div className="min-h-full bg-gradient-to-br from-cyan-50/40 via-white to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">
              Monitoreo inteligente
            </p>
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
                <span className="material-symbols-outlined text-[20px]">search</span>
                Buscar
              </Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6">
          {/* Sidebar saved searches */}
          <aside className="order-2 lg:order-1">
            <Card className="p-5 sticky top-4">
              <h3 className="font-display text-sm font-black uppercase tracking-tight mb-3 text-slate-700">
                Búsquedas guardadas
              </h3>
              {!activeProject ? (
                <p className="text-xs text-slate-500">
                  Selecciona un proyecto para guardar búsquedas.
                </p>
              ) : saved.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : savedList.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Tus búsquedas aparecerán aquí después de tu primer rastreo.
                </p>
              ) : (
                <ul className="space-y-1">
                  {savedList.map((r) => {
                    const label = r.title.replace(/^Noticias:\s*/i, '');
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => rerunSaved(r)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-50 transition-colors',
                            currentTopic &&
                              label.toLowerCase() === currentTopic.toLowerCase() &&
                              'bg-cyan-50 border border-cyan-200',
                          )}
                        >
                          <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {relativeDate(r.createdAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </aside>

          {/* Main */}
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
              <Card className="p-10 text-center">
                <h3 className="font-display text-xl font-bold mb-2">Sin resultados</h3>
                <p className="text-sm text-slate-500">
                  No encontramos noticias recientes para{' '}
                  <span className="font-semibold">{currentTopic}</span>. Prueba con otros términos.
                </p>
              </Card>
            )}

            {hasResults && (
              <>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="font-display text-xl font-bold">
                    Resultados{' '}
                    <span className="text-sm text-slate-500 font-normal">
                      ({items.length} noticias)
                    </span>
                  </h2>
                  {currentTopic && (
                    <Badge className="bg-cyan-100 text-cyan-700 border border-cyan-200">
                      {currentTopic}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {items.map((it, idx) => (
                    <Card
                      key={`${it.url}-${idx}`}
                      className="p-5 flex flex-col gap-3 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        {it.source && (
                          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] uppercase">
                            {it.source}
                          </Badge>
                        )}
                        {it.published_at && (
                          <span className="text-[11px] text-slate-500">
                            {relativeDate(it.published_at)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-slate-900 leading-snug line-clamp-3">
                        {it.title}
                      </h3>
                      {it.summary && (
                        <p className="text-sm text-slate-600 line-clamp-4">{it.summary}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                        >
                          Leer más
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => askSiraAbout(it)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-cyan-700 px-3 py-2 rounded-lg hover:bg-cyan-50 transition-colors min-h-[44px]"
                          aria-label="Preguntar a Sira"
                        >
                          <span className="material-symbols-outlined text-[14px]">forum</span>
                          Preguntar a Sira
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
