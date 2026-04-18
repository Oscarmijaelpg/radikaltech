import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, Card } from '@radikal/ui';
import { authorityStars, relevanceClasses, sentimentClasses, sentimentLabel } from './helpers';
import { LegacySourcesList } from './LegacySourcesList';
import { NarrativeWithCitations } from './NarrativeWithCitations';
import {
  type EnrichedNewsItemUI,
  type NewsAnalysis,
  type NewsItemSimple,
  SENTIMENT_COLORS,
} from './types';

export function NewsRichBlock({
  items,
  analysis,
}: {
  items: NewsItemSimple[];
  analysis: NewsAnalysis | null;
}) {
  const enriched = analysis?.items_enriched ?? null;
  const [onlyHighImpact, setOnlyHighImpact] = useState(false);
  const [onlyTrusted, setOnlyTrusted] = useState(false);

  const sourcesData = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((it) => {
      const src = it.source ?? 'desconocido';
      counts.set(src, (counts.get(src) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [items]);

  const uniqueSources = useMemo(
    () => new Set(items.map((it) => it.source ?? '').filter(Boolean)).size,
    [items],
  );

  const sentimentData = useMemo(() => {
    const sb = analysis?.sentiment_breakdown ?? { positive: 0, neutral: 0, negative: 0 };
    return [
      { name: 'Positivo', value: Number(sb.positive ?? 0), key: 'positive' },
      { name: 'Neutral', value: Number(sb.neutral ?? 0), key: 'neutral' },
      { name: 'Negativo', value: Number(sb.negative ?? 0), key: 'negative' },
    ].filter((d) => d.value > 0);
  }, [analysis]);

  const themes = analysis?.top_themes ?? [];
  const keywords = analysis?.trending_keywords ?? [];
  const perItem = analysis?.per_item_sentiment ?? {};
  const topTheme = themes[0];

  const highImpactCount = useMemo(
    () => (enriched ?? []).filter((e) => e.relevance_score >= 80).length,
    [enriched],
  );

  const timelineData = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 20; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    for (const it of items) {
      if (!it.published_at) continue;
      try {
        const k = new Date(it.published_at).toISOString().slice(0, 10);
        if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
      } catch {
        /* noop */
      }
    }
    return Array.from(map.entries()).map(([date, count]) => ({
      date: date.slice(5),
      count,
    }));
  }, [items]);

  const enrichedView = useMemo(() => {
    if (!enriched || enriched.length === 0) return null;
    const byCluster = new Map<string, EnrichedNewsItemUI[]>();
    const standalone: EnrichedNewsItemUI[] = [];
    for (const e of enriched) {
      if (e.cluster_id && (e.cluster_size ?? 1) > 1) {
        const arr = byCluster.get(e.cluster_id) ?? [];
        arr.push(e);
        byCluster.set(e.cluster_id, arr);
      } else {
        standalone.push(e);
      }
    }
    interface Group {
      lead: EnrichedNewsItemUI;
      others: EnrichedNewsItemUI[];
    }
    const groups: Group[] = [];
    for (const arr of byCluster.values()) {
      const sorted = [...arr].sort((a, b) => b.source_authority - a.source_authority);
      groups.push({ lead: sorted[0]!, others: sorted.slice(1) });
    }
    for (const e of standalone) groups.push({ lead: e, others: [] });
    const filtered = groups.filter(({ lead }) => {
      if (onlyHighImpact && lead.relevance_score < 80) return false;
      if (onlyTrusted && lead.source_authority < 70) return false;
      return true;
    });
    filtered.sort(
      (a, b) =>
        b.lead.relevance_score - a.lead.relevance_score ||
        b.lead.source_authority - a.lead.source_authority,
    );
    return filtered;
  }, [enriched, onlyHighImpact, onlyTrusted]);

  const hasTimeline = timelineData.some((d) => d.count > 0);

  return (
    <div className="mb-6">
      {highImpactCount > 0 && (
        <div className="mb-4 rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 text-[22px]">warning</span>
          <p className="text-sm text-red-900 font-semibold">
            {highImpactCount} noticia{highImpactCount !== 1 ? 's' : ''} de alto impacto para tu marca (relevancia ≥ 80).
          </p>
        </div>
      )}

      {hasTimeline && (
        <div className="mb-6 p-4 rounded-2xl border border-slate-200 bg-white">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-600 text-[18px]">timeline</span>
            Noticias por día (últimos 21 días)
          </h4>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={timelineData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
              <Tooltip />
              <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {analysis?.executive_summary && (
        <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-cyan-600 text-[24px] mt-1">
              insights
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg mb-2">Resumen ejecutivo</h3>
              <p className="text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                {analysis.executive_summary}
              </p>
            </div>
          </div>
        </Card>
      )}

      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-2xl border border-slate-200 bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Noticias
            </p>
            <p className="font-display text-2xl font-black text-slate-900">{items.length}</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Sentiment
            </p>
            <Badge className={`${sentimentClasses(analysis.overall_sentiment)} border text-xs`}>
              {sentimentLabel(analysis.overall_sentiment)}
            </Badge>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Fuentes
            </p>
            <p className="font-display text-2xl font-black text-slate-900">{uniqueSources}</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-white min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Tema #1
            </p>
            <p className="text-sm font-bold text-slate-900 break-words line-clamp-2">
              {topTheme?.name ?? '—'}
            </p>
          </div>
        </div>
      )}

      {(sentimentData.length > 0 || sourcesData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {sentimentData.length > 0 && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Distribución de sentiment</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {sentimentData.map((entry) => (
                      <Cell key={entry.key} fill={SENTIMENT_COLORS[entry.key] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {sourcesData.length > 0 && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Noticias por fuente</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sourcesData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {themes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-600">category</span>
            Temas principales
          </h3>
          <div className="space-y-2">
            {themes.map((t, idx) => (
              <div key={`${t.name}-${idx}`} className="p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                  <h4 className="font-semibold text-sm break-words">{t.name}</h4>
                  <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 border text-[11px]">
                    {t.count} noticias
                  </Badge>
                </div>
                {t.description && (
                  <p className="text-xs text-slate-600 break-words">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-600">trending_up</span>
            Palabras clave
          </h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw, idx) => (
              <span
                key={`${kw}-${idx}`}
                className="px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-semibold text-cyan-800"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis?.narrative && (
        <div className="mb-8">
          <h3 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-600 text-[22px]">article</span>
            Análisis completo
          </h3>
          <div className="prose prose-slate prose-sm md:prose-base max-w-none text-slate-800 leading-relaxed break-words">
            <NarrativeWithCitations narrative={analysis.narrative} items={items} />
          </div>
        </div>
      )}

      {enrichedView && (
        <div className="mb-3 flex flex-wrap gap-2 items-center">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
            <input
              type="checkbox"
              className="accent-red-600"
              checked={onlyHighImpact}
              onChange={(e) => setOnlyHighImpact(e.target.checked)}
            />
            Solo alto impacto
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
            <input
              type="checkbox"
              className="accent-cyan-600"
              checked={onlyTrusted}
              onChange={(e) => setOnlyTrusted(e.target.checked)}
            />
            Solo fuentes confiables (&gt;70)
          </label>
        </div>
      )}

      {enrichedView ? (
        <div>
          <h3 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-600 text-[22px]">
              format_list_numbered
            </span>
            Fuentes ({enrichedView.length})
          </h3>
          <ol className="space-y-2 list-none pl-0">
            {enrichedView.map(({ lead, others }, idx) => {
              const n = (lead.original_index ?? idx) + 1;
              const stars = authorityStars(lead.source_authority);
              return (
                <li
                  key={lead.url ?? idx}
                  id={`fuente-${n}`}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center text-xs font-bold border border-cyan-200">
                      {n}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm font-semibold text-slate-900 hover:text-cyan-700 break-words line-clamp-2 block"
                      >
                        {lead.title || lead.url}
                      </a>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          className={`${relevanceClasses(lead.relevance_score)} border text-[10px] uppercase`}
                        >
                          Relevancia {Math.round(lead.relevance_score)}
                        </Badge>
                        <span
                          className="text-[10px] font-semibold text-amber-700"
                          title={`Autoridad ${lead.source_authority}/100`}
                        >
                          {'★'.repeat(stars)}
                          <span className="text-slate-300">{'★'.repeat(5 - stars)}</span>
                        </span>
                        {lead.sentiment && (
                          <Badge
                            className={`${sentimentClasses(lead.sentiment)} border text-[10px] uppercase`}
                          >
                            {sentimentLabel(lead.sentiment)}
                          </Badge>
                        )}
                        {lead.source && (
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {lead.source}
                          </span>
                        )}
                        {(lead.cluster_size ?? 1) > 1 && (
                          <Badge className="bg-violet-100 text-violet-700 border-violet-200 border text-[10px]">
                            Agrupada ({lead.cluster_size})
                          </Badge>
                        )}
                      </div>
                      {lead.relevance_reason && (
                        <p className="mt-1.5 text-[11px] text-slate-500 italic break-words line-clamp-2">
                          {lead.relevance_reason}
                        </p>
                      )}
                      {others.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-[11px] text-slate-500 cursor-pointer font-semibold hover:text-slate-700">
                            +{others.length} fuente{others.length !== 1 ? 's' : ''} similar{others.length !== 1 ? 'es' : ''}
                          </summary>
                          <ul className="mt-1.5 space-y-1 pl-3">
                            {others.map((o, i) => (
                              <li key={i} className="text-[11px]">
                                <a
                                  href={o.url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-slate-600 hover:text-cyan-700 break-words"
                                >
                                  {o.source ? `${o.source} — ` : ''}
                                  {o.title || o.url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <LegacySourcesList items={items} perItem={perItem} />
      )}
    </div>
  );
}
