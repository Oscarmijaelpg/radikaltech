import { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
import {
  Badge,
  Button,
  Card,
  Skeleton,
  Spinner,
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useReport, useDeleteReport, type ReportType } from '../api/reports';
import { useProject } from '@/providers/ProjectProvider';
import { useProjectLogoWithBrightness, logoContainerStyle } from '@/shared/hooks/useProjectLogo';

function ReportLogo({ projectId }: { projectId: string }) {
  const { activeProject } = useProject();
  const isActive = !!(activeProject && activeProject.id === projectId);
  const { url: logo, brightness } = useProjectLogoWithBrightness(isActive ? projectId : null);
  if (!logo) return null;
  return (
    <div
      className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-slate-200 overflow-hidden grid place-items-center shrink-0"
      style={logoContainerStyle(brightness)}
    >
      <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
    </div>
  );
}

interface Props {
  reportId: string;
  onDeleted?: () => void;
}

const TYPE_LABELS: Record<ReportType, { label: string; classes: string; icon: string }> = {
  competition: {
    label: 'Competencia',
    classes: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: 'radar',
  },
  monthly_audit: {
    label: 'Auditoría',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'fact_check',
  },
  brand_strategy: {
    label: 'Estrategia',
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
    icon: 'auto_awesome',
  },
  news: {
    label: 'Noticias',
    classes: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    icon: 'newspaper',
  },
  general: {
    label: 'General',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'description',
  },
};

interface Citation {
  id?: string;
  title?: string;
  url?: string;
}

interface NewsItemSimple {
  title?: string;
  url?: string;
  source?: string;
  summary?: string;
  published_at?: string;
  sentiment?: string;
}

interface EnrichedNewsItemUI {
  original_index: number;
  title: string;
  url: string;
  source?: string;
  source_authority: number;
  relevance_score: number;
  relevance_reason?: string;
  cluster_id?: string;
  cluster_size?: number;
  sentiment?: string;
}

interface NewsAnalysis {
  narrative?: string;
  executive_summary?: string;
  top_themes?: Array<{ name: string; count: number; description?: string }>;
  overall_sentiment?: string;
  sentiment_breakdown?: { positive?: number; neutral?: number; negative?: number };
  per_item_sentiment?: Record<string, string>;
  key_insights?: string[];
  trending_keywords?: string[];
  items_enriched?: EnrichedNewsItemUI[];
}

interface CompetitorBlock {
  name?: string;
  url?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
}

interface StructuredInsight {
  text?: string;
  impact?: string;
}

function sentimentClasses(s?: string): string {
  const v = (s ?? '').toLowerCase();
  if (v === 'positive' || v === 'positivo') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (v === 'negative' || v === 'negativo') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function impactClasses(i?: string): string {
  const v = (i ?? '').toLowerCase();
  if (v === 'high' || v === 'alto') return 'bg-red-100 text-red-700 border-red-200';
  if (v === 'medium' || v === 'medio') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (v === 'low' || v === 'bajo') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function parseInsights(items: string[]): Array<StructuredInsight> {
  return items.map((raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && ('text' in parsed || 'impact' in parsed)) {
        return parsed as StructuredInsight;
      }
    } catch {
      /* noop */
    }
    return { text: raw };
  });
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Detecta si un string es JSON parseable (objeto o array) */
function tryParseJson(s: string | null | undefined): unknown | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function fmtDate(s?: string): string {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function ReportReader({ reportId, onDeleted }: Props) {
  const confirmDialog = useConfirm();
  const { data: report, isLoading } = useReport(reportId);
  const del = useDeleteReport();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const sourceData = (report?.sourceData ?? {}) as Record<string, unknown>;
  const citations = safeArray<Citation>(sourceData.citations);

  // Extraer items de noticias (puede venir en sourceData como array, como objeto {items, analysis}, o en content JSON)
  const newsItems = useMemo<NewsItemSimple[]>(() => {
    if (report?.reportType !== 'news') return [];
    const sd = report.sourceData;
    if (Array.isArray(sd)) return sd as NewsItemSimple[];
    if (sd && typeof sd === 'object' && 'items' in sd && Array.isArray((sd as { items?: unknown }).items)) {
      return (sd as { items: NewsItemSimple[] }).items;
    }
    const parsed = tryParseJson(report.content);
    if (Array.isArray(parsed)) return parsed as NewsItemSimple[];
    return [];
  }, [report?.reportType, report?.sourceData, report?.content]);

  const newsAnalysis = useMemo<NewsAnalysis | null>(() => {
    if (report?.reportType !== 'news') return null;
    const sd = report.sourceData;
    if (sd && typeof sd === 'object' && !Array.isArray(sd) && 'analysis' in sd) {
      const a = (sd as { analysis?: NewsAnalysis }).analysis;
      if (a && typeof a === 'object') return a;
    }
    return null;
  }, [report?.reportType, report?.sourceData]);

  // Extraer competidores si el reporte de competencia trae JSON
  const competitorBlocks = useMemo<CompetitorBlock[]>(() => {
    if (report?.reportType !== 'competition') return [];
    const parsed = tryParseJson(report.content);
    if (parsed && typeof parsed === 'object' && 'competitors' in parsed) {
      const c = (parsed as { competitors?: CompetitorBlock[] }).competitors;
      return Array.isArray(c) ? c : [];
    }
    if (Array.isArray(parsed)) return parsed as CompetitorBlock[];
    return [];
  }, [report?.reportType, report?.content]);

  const insights = useMemo(() => parseInsights(report?.keyInsights ?? []), [report?.keyInsights]);

  // Decide si renderizar `content` como markdown:
  // - News con newsItems → NO (ya está renderizado como cards)
  // - Competition con competitorBlocks → NO
  // - Si el content es JSON puro y no tenemos vista especial → mostrar como pre formateado
  // - Otherwise → markdown
  const contentMode: 'markdown' | 'json' | 'skip' = useMemo(() => {
    if (!report?.content) return 'skip';
    if (report.reportType === 'news' && newsItems.length > 0) return 'skip';
    if (report.reportType === 'competition' && competitorBlocks.length > 0) return 'skip';
    const parsed = tryParseJson(report.content);
    if (parsed !== null) return 'json';
    return 'markdown';
  }, [report?.content, report?.reportType, newsItems.length, competitorBlocks.length]);

  const exportPdf = async () => {
    if (!containerRef.current || !report) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 20;
      pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      while (heightLeft > 0) {
        position = 20 - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const filename = `${report.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      pdf.save(filename);
    } finally {
      setExporting(false);
    }
  };

  const exportDocx = () => {
    if (!report) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${report.title}</title></head><body>${containerRef.current?.innerHTML ?? ''}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onDelete = async () => {
    if (!report) return;
    const ok = await confirmDialog({ title: '¿Eliminar este reporte?', variant: 'danger', confirmLabel: 'Eliminar' });
    if (!ok) return;
    await del.mutateAsync({ id: report.id, project_id: report.projectId });
    onDeleted?.();
  };

  if (isLoading || !report) {
    return <Skeleton className="h-96" />;
  }

  const typeMeta = TYPE_LABELS[report.reportType] ?? TYPE_LABELS.general;
  const createdAt = new Date(report.createdAt);

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
        <UITooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={() => void exportPdf()} disabled={exporting}>
              {exporting ? (
                <Spinner className="h-4 w-4 mr-1" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              )}
              Descargar PDF
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px]">
            Exporta este reporte como PDF para compartir
          </TooltipContent>
        </UITooltip>
        <Button variant="outline" onClick={exportDocx}>
          <span className="material-symbols-outlined text-[18px]">description</span>
          Descargar DOCX
        </Button>
        <Button variant="ghost" onClick={() => void onDelete()} className="text-red-600 hover:bg-red-50">
          <span className="material-symbols-outlined text-[18px]">delete</span>
          Eliminar
        </Button>
      </div>

      <Card className="p-4 sm:p-6 md:p-8 overflow-hidden">
        <div ref={containerRef} className="max-w-none min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Badge className={`${typeMeta.classes} border inline-flex items-center gap-1`}>
              <span className="material-symbols-outlined text-[14px]">{typeMeta.icon}</span>
              {typeMeta.label}
            </Badge>
            <span className="text-xs text-slate-500">
              {createdAt.toLocaleDateString('es', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <ReportLogo projectId={report.projectId} />
            <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex-1 min-w-0 break-words">
              {report.title}
            </h1>
          </div>

          {report.summary && (
            <div className="mb-6 rounded-2xl border-l-4 border-violet-400 bg-violet-50/50 p-4">
              <p className="text-base text-slate-700 italic leading-relaxed break-words">
                {report.summary}
              </p>
            </div>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <div className="mb-6">
              <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-600 text-[22px]">
                  lightbulb
                </span>
                Insights clave
              </h2>
              <ol className="space-y-2">
                {insights.map((ins, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-violet-50/40 border border-violet-100"
                  >
                    <span className="shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white grid place-items-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-800 break-words leading-relaxed">
                      {ins.text ?? ''}
                    </span>
                    {ins.impact && (
                      <Badge
                        className={`${impactClasses(ins.impact)} border text-[10px] uppercase shrink-0`}
                      >
                        {ins.impact}
                      </Badge>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Noticias enriquecidas con análisis IA */}
          {report.reportType === 'news' && newsItems.length > 0 && (
            <NewsRichBlock items={newsItems} analysis={newsAnalysis} />
          )}

          {/* Competidores (cards bonitas) */}
          {report.reportType === 'competition' && competitorBlocks.length > 0 && (
            <div className="mb-6">
              <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-[22px]">
                  radar
                </span>
                Competidores analizados
              </h2>
              <div className="space-y-3">
                {competitorBlocks.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white min-w-0"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900 break-words">
                        {c.name ?? `Competidor ${idx + 1}`}
                      </h3>
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-xs font-semibold text-rose-600 hover:underline break-all"
                        >
                          {c.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      )}
                    </div>
                    {c.summary && (
                      <p className="text-sm text-slate-700 mb-3 break-words leading-relaxed">
                        {c.summary}
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {c.strengths && c.strengths.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1.5">
                            Fortalezas
                          </p>
                          <ul className="space-y-1">
                            {c.strengths.map((s, i) => (
                              <li
                                key={i}
                                className="text-xs text-slate-700 flex items-start gap-1.5 break-words"
                              >
                                <span className="text-emerald-600 mt-0.5">+</span>
                                <span className="flex-1">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {c.weaknesses && c.weaknesses.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-red-700 mb-1.5">
                            Debilidades
                          </p>
                          <ul className="space-y-1">
                            {c.weaknesses.map((w, i) => (
                              <li
                                key={i}
                                className="text-xs text-slate-700 flex items-start gap-1.5 break-words"
                              >
                                <span className="text-red-600 mt-0.5">−</span>
                                <span className="flex-1">{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content normal: markdown */}
          {contentMode === 'markdown' && report.content && (
            <div className="prose prose-slate prose-sm md:prose-base max-w-none break-words [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: (props) => (
                    <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight mt-6 mb-3 text-slate-900" {...props} />
                  ),
                  h2: (props) => (
                    <h2 className="text-xl md:text-2xl font-display font-black tracking-tight mt-8 mb-3 text-slate-900" {...props} />
                  ),
                  h3: (props) => (
                    <h3 className="text-lg md:text-xl font-bold mt-6 mb-2 text-slate-800" {...props} />
                  ),
                  h4: (props) => (
                    <h4 className="text-base font-bold mt-5 mb-2 text-slate-800" {...props} />
                  ),
                  p: (props) => (
                    <p className="text-sm md:text-base leading-relaxed text-slate-700 mb-4" {...props} />
                  ),
                  ul: (props) => <ul className="list-disc pl-5 space-y-1.5 mb-4 text-slate-700" {...props} />,
                  ol: (props) => <ol className="list-decimal pl-5 space-y-1.5 mb-4 text-slate-700" {...props} />,
                  li: (props) => <li className="text-sm md:text-base leading-relaxed" {...props} />,
                  strong: (props) => <strong className="font-bold text-slate-900" {...props} />,
                  em: (props) => <em className="italic" {...props} />,
                  a: ({ href, ...props }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-violet-700 hover:underline font-semibold"
                      {...props}
                    />
                  ),
                  blockquote: (props) => (
                    <blockquote className="border-l-4 border-violet-400 bg-violet-50/50 pl-4 py-2 my-4 italic text-slate-700" {...props} />
                  ),
                  code: ({ className, children, ...props }: React.ComponentProps<'code'>) => {
                    const isBlock = /language-/.test(className ?? '');
                    if (isBlock) {
                      return (
                        <code className="block bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto my-3" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                  table: (props) => (
                    <div className="my-4 overflow-x-auto">
                      <table className="w-full border-collapse text-sm" {...props} />
                    </div>
                  ),
                  th: (props) => (
                    <th className="bg-slate-100 px-3 py-2 text-left font-bold text-xs uppercase tracking-wide border-b-2 border-slate-200" {...props} />
                  ),
                  td: (props) => (
                    <td className="px-3 py-2 border-b border-slate-100 text-sm" {...props} />
                  ),
                  hr: () => <hr className="my-6 border-slate-200" />,
                }}
              >
                {report.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Content como JSON estructurado: lo formateamos pero no como crudo gigante */}
          {contentMode === 'json' && report.content && (
            <details className="mt-4">
              <summary className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700">
                Ver datos crudos del reporte (JSON)
              </summary>
              <pre className="mt-2 text-[11px] bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(tryParseJson(report.content), null, 2)}
              </pre>
            </details>
          )}

          {/* Citations */}
          {citations.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 text-[20px]">
                  link
                </span>
                Fuentes
              </h2>
              <ul className="space-y-1.5">
                {citations.map((c, idx) => (
                  <li key={c.id ?? idx} className="text-sm flex items-start gap-2 break-words">
                    <span className="text-slate-400 shrink-0">[{idx + 1}]</span>
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-violet-700 hover:underline break-all flex-1 min-w-0"
                      >
                        {c.title ?? c.url}
                      </a>
                    ) : (
                      <span className="flex-1 min-w-0">{c.title ?? '—'}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10b981',
  neutral: '#94a3b8',
  negative: '#ef4444',
};

function sentimentLabel(s?: string): string {
  const v = (s ?? '').toLowerCase();
  if (v === 'positive' || v === 'positivo') return 'Positivo';
  if (v === 'negative' || v === 'negativo') return 'Negativo';
  if (v === 'neutral') return 'Neutral';
  return s ?? '—';
}

function relevanceClasses(score: number): string {
  if (score >= 80) return 'bg-red-100 text-red-700 border-red-200';
  if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function authorityStars(authority: number): number {
  return Math.max(1, Math.min(5, Math.round(authority / 20)));
}

function NewsRichBlock({
  items,
  analysis,
}: {
  items: NewsItemSimple[];
  analysis: NewsAnalysis | null;
}) {
  const enriched = analysis?.items_enriched ?? null;
  const [onlyHighImpact, setOnlyHighImpact] = useState(false);
  const [onlyTrusted, setOnlyTrusted] = useState(false);
  // Agrupar por fuente (top 8)
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

  // High impact items (relevance >= 80)
  const highImpactCount = useMemo(
    () => (enriched ?? []).filter((e) => e.relevance_score >= 80).length,
    [enriched],
  );

  // Timeline: posts per day in last 21 days
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

  // Build enriched view: group by cluster_id. For each cluster show item with highest authority.
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
    // filters
    const filtered = groups.filter(({ lead }) => {
      if (onlyHighImpact && lead.relevance_score < 80) return false;
      if (onlyTrusted && lead.source_authority < 70) return false;
      return true;
    });
    // sort by relevance desc, then authority
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
      {/* HIGH IMPACT ALERT */}
      {highImpactCount > 0 && (
        <div className="mb-4 rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 text-[22px]">warning</span>
          <p className="text-sm text-red-900 font-semibold">
            {highImpactCount} noticia{highImpactCount !== 1 ? 's' : ''} de alto impacto para tu marca (relevancia ≥ 80).
          </p>
        </div>
      )}

      {/* TIMELINE */}
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

      {/* EXECUTIVE SUMMARY */}
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

      {/* KPIs */}
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
            <Badge
              className={`${sentimentClasses(analysis.overall_sentiment)} border text-xs`}
            >
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

      {/* CHARTS */}
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
                      <Cell
                        key={entry.key}
                        fill={SENTIMENT_COLORS[entry.key] ?? '#94a3b8'}
                      />
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
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* TOP THEMES */}
      {themes.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-600">category</span>
            Temas principales
          </h3>
          <div className="space-y-2">
            {themes.map((t, idx) => (
              <div
                key={`${t.name}-${idx}`}
                className="p-3 rounded-xl border border-slate-200 bg-white"
              >
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

      {/* TRENDING KEYWORDS */}
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

      {/* NARRATIVE con citaciones inline clickables */}
      {analysis?.narrative && (
        <div className="mb-8">
          <h3 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-600 text-[22px]">
              article
            </span>
            Análisis completo
          </h3>
          <div className="prose prose-slate prose-sm md:prose-base max-w-none text-slate-800 leading-relaxed break-words">
            <NarrativeWithCitations narrative={analysis.narrative} items={items} />
          </div>
        </div>
      )}

      {/* FILTERS */}
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

      {/* FUENTES NUMERADAS (enriched) */}
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

function LegacySourcesList({
  items,
  perItem,
}: {
  items: NewsItemSimple[];
  perItem: Record<string, string>;
}) {
  return (
    <div>
      <h3 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-cyan-600 text-[22px]">
          format_list_numbered
        </span>
        Fuentes ({items.length})
      </h3>
      <ol className="space-y-2 list-none pl-0">
        {items.map((it, idx) => {
            const mapped = it.url ? perItem[it.url] : undefined;
            const sentiment = mapped ?? it.sentiment;
            const n = idx + 1;
            return (
              <li
                key={`${it.url ?? idx}`}
                id={`fuente-${n}`}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 transition-colors min-w-0"
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center text-xs font-bold border border-cyan-200">
                  {n}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-semibold text-slate-900 hover:text-cyan-700 break-words line-clamp-2 block"
                  >
                    {it.title ?? it.url}
                  </a>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {sentiment && (
                      <Badge
                        className={`${sentimentClasses(sentiment)} border text-[10px] uppercase`}
                      >
                        {sentimentLabel(sentiment)}
                      </Badge>
                    )}
                    {it.source && (
                      <span className="text-[11px] text-slate-500 font-semibold">
                        {it.source}
                      </span>
                    )}
                    {it.published_at && (
                      <span className="text-[11px] text-slate-400">
                        · {fmtDate(it.published_at)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
    </div>
  );
}

/**
 * Renderiza un texto con citas inline tipo [1][2] como superíndices clickables
 * que saltan a #fuente-N (y en hover muestran el título de la noticia).
 */
function NarrativeWithCitations({
  narrative,
  items,
}: {
  narrative: string;
  items: NewsItemSimple[];
}) {
  // Regex: captura [N] o [N,M] o [N][M] — los separa en citas individuales
  const parts = useMemo(() => {
    const out: Array<{ type: 'text'; content: string } | { type: 'cite'; n: number }> = [];
    const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(narrative)) !== null) {
      if (m.index > lastIdx) {
        out.push({ type: 'text', content: narrative.slice(lastIdx, m.index) });
      }
      const nums = m[1]!.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      for (const n of nums) {
        out.push({ type: 'cite', n });
      }
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < narrative.length) {
      out.push({ type: 'text', content: narrative.slice(lastIdx) });
    }
    return out;
  }, [narrative]);

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.content}</span>;
        const item = items[p.n - 1];
        return (
          <a
            key={i}
            href={item?.url ?? `#fuente-${p.n}`}
            onClick={(e) => {
              if (!item?.url) {
                e.preventDefault();
                document
                  .getElementById(`fuente-${p.n}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            target={item?.url ? '_blank' : undefined}
            rel={item?.url ? 'noreferrer noopener' : undefined}
            title={item?.title ?? `Fuente ${p.n}`}
            className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 mx-0.5 text-[10px] font-bold rounded-md bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 transition-colors align-super no-underline"
          >
            {p.n}
          </a>
        );
      })}
    </div>
  );
}
