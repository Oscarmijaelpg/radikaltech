import { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
import { useReport, useDeleteReport } from '../api/reports';
import { impactClasses, parseInsights, safeArray, tryParseJson } from './reader/helpers';
import { markdownComponents } from './reader/markdown';
import { NewsRichBlock } from './reader/NewsRichBlock';
import { ReportLogo } from './reader/ReportLogo';
import {
  type Citation,
  type CompetitorBlock,
  type NewsAnalysis,
  type NewsItemSimple,
  TYPE_LABELS,
} from './reader/types';

interface Props {
  reportId: string;
  onDeleted?: () => void;
}

export function ReportReader({ reportId, onDeleted }: Props) {
  const confirmDialog = useConfirm();
  const { data: report, isLoading } = useReport(reportId);
  const del = useDeleteReport();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const sourceData = (report?.sourceData ?? {}) as Record<string, unknown>;
  const citations = safeArray<Citation>(sourceData.citations);

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

          {report.reportType === 'news' && newsItems.length > 0 && (
            <NewsRichBlock items={newsItems} analysis={newsAnalysis} />
          )}

          {report.reportType === 'competition' && competitorBlocks.length > 0 && (
            <div className="mb-6">
              <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-[22px]">radar</span>
                Competidores analizados
              </h2>
              <div className="space-y-3">
                {competitorBlocks.map((c, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white min-w-0">
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

          {contentMode === 'markdown' && report.content && (
            <div className="prose prose-slate prose-sm md:prose-base max-w-none break-words [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {report.content}
              </ReactMarkdown>
            </div>
          )}

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

          {citations.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 text-[20px]">link</span>
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
