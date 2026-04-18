import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/utils/cn';
import { exportToPDF, exportToWord } from '@/shared/utils/exportUtils';
import { Icon } from '@radikal/ui';

interface ReportPanelProps {
  content: string;
  isThinking: boolean;
  onClose: () => void;
}

const processCitations = (content: string, idPrefix: string, newsArray: unknown[] = []) => {
  if (!content) return '';
  const sourceMap: Record<string, string> = {};

  if (newsArray && newsArray.length > 0) {
    (newsArray as Record<string, string>[]).forEach((item, index) => {
      const num = (index + 1).toString();
      const url =
        item.url ||
        item.link ||
        item.url_fuente ||
        (typeof item.source === 'string' && item.source.startsWith('http') ? item.source : null);
      if (url) sourceMap[num] = url;
    });
  }

  content.split('\n').forEach((line) => {
    const numMatch = line.match(/^\s*(?:[-*+]\s*)?(?:\[)?(\d+)(?:\])?[.):\-\s]+/);
    if (numMatch?.[1]) {
      const num = numMatch[1];
      const urlMatch = line.match(/(https?:\/\/[^\s)\]'"<>]+)/);
      if (urlMatch?.[1]) sourceMap[num] = urlMatch[1];
    }
  });

  const refRegex = /\[(\d+)\]:\s*(https?:\/\/[^\s)\]'"<>]+)/g;
  let match;
  while ((match = refRegex.exec(content)) !== null) {
    if (match[1] && match[2]) sourceMap[match[1]] = match[2];
  }

  let text = content;

  text = text.replace(
    /^(\s*(?:[-*+]\s*)?(?:\[)?(\d+)(?:\])?[.):\-\s]+)(.*?)(https?:\/\/[^\s)\]'"<>]+)(.*?)$/gm,
    (fullLine, prefix, _num, titlePart, url, rest) => {
      if (fullLine.includes(`](${url})`)) return fullLine;
      const cleanTitle = titlePart.replace(/[-–:]\s*$/, '').trim();
      return `${prefix}${cleanTitle ? cleanTitle + ' — ' : ''}[${url}](${url})${rest}`;
    },
  );

  text = text.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (ogMatch, numsStr) => {
    const nums = numsStr.split(',').map((n: string) => n.trim());
    const links = nums.map((n: string) => {
      const url = sourceMap[n];
      if (url) return `[${n}](${url})`;
      return `[${n}](#source-${idPrefix}-${n})`;
    });
    return links.join(' ');
  });

  return text;
};

export function ReportPanel({ content, isThinking, onClose }: ReportPanelProps) {
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  const structuredData = useMemo(() => {
    if (isThinking || !content) return null;
    try {
      const jsonMatch =
        content.match(/<report_data>([\s\S]*?)<\/report_data>/) ||
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const rawJson = jsonMatch[1] || jsonMatch[0];
        const data = JSON.parse(rawJson.trim());
        if (data.company_name || (data.news && Array.isArray(data.news))) {
          return data;
        }
      }
    } catch {
      // not structured data
    }
    return null;
  }, [content, isThinking]);

  const handleDownloadPDF = async () => {
    setIsDownloadMenuOpen(false);
    const fileName = structuredData?.company_name
      ? `reporte-${structuredData.company_name.toLowerCase().replace(/\s+/g, '-')}.pdf`
      : 'reporte-radikal.pdf';
    await exportToPDF('report-content', fileName, structuredData);
  };

  const handleDownloadWord = async () => {
    setIsDownloadMenuOpen(false);
    const title = structuredData?.company_name
      ? `Informe Estratégico - ${structuredData.company_name}`
      : 'Informe Detallado Radikal IA';
    const displayContent = structuredData
      ? `Informe para: ${structuredData.company_name}\nFecha: ${structuredData.report_date}\n\nResumen:\n${
          structuredData.news
            ?.map((item: { title?: string; source?: string }) => `- ${item.title} (${item.source})`)
            .join('\n') ?? ''
        }`
      : content;
    await exportToWord(displayContent, title);
  };

  return (
    <div className="w-full flex flex-col bg-slate-50 border-l border-slate-200 animate-in slide-in-from-right duration-500 overflow-hidden h-full">
      <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center">
            <Icon name="description" className="text-[hsl(var(--color-primary))] text-xl" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 leading-tight text-sm sm:text-base">
              Informe Detallado
            </h2>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Generado por IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {isThinking && (
            <div className="flex items-center gap-2 bg-[hsl(var(--color-primary)/0.05)] px-3 py-1 rounded-full border border-[hsl(var(--color-primary)/0.2)] shadow-sm">
              <span className="text-[10px] font-bold text-[hsl(var(--color-primary))] uppercase tracking-widest animate-pulse">
                Analizando
              </span>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce" />
                <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]" />
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-white">
        <div id="report-content" className="w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12 md:px-12 md:py-20">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 sm:mb-12 border-b border-slate-100 pb-6 sm:pb-8">
            <div className="flex flex-col gap-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                RADIKAL<span className="text-[hsl(var(--color-primary))]">IA</span>
              </div>
              <p className="text-[10px] font-black tracking-[0.2em] text-[hsl(var(--color-primary))] mt-1 uppercase">
                Inteligencia Estratégica
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">
                Análisis Radikal IA
              </div>
              <div className="text-[12px] font-bold text-slate-600">
                {new Date().toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {content ? (
            <div className="w-full text-black">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ className, ...props }: React.ComponentProps<'h1'>) => (
                    <h1
                      className={cn(
                        'text-3xl sm:text-5xl font-black text-black mb-2 tracking-tighter leading-tight',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  h2: ({ className, children, ...props }: React.ComponentProps<'h2'>) => {
                    const text = typeof children === 'string' ? children : '';
                    const isSources = /fuentes|sources|bibliograf/i.test(text);
                    if (isSources) {
                      return (
                        <div className="mt-12 sm:mt-16 mb-6">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="h-px flex-1 bg-slate-200" />
                            <h2
                              className={cn(
                                'flex items-center gap-2 text-slate-500 text-[12px] font-black uppercase tracking-[0.3em] px-4',
                                className,
                              )}
                            >
                              <Icon name="link" className="text-[16px]" />
                              {children}
                            </h2>
                            <span className="h-px flex-1 bg-slate-200" />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-10 sm:mt-14 mb-6 sm:mb-8">
                        <h2
                          className={cn(
                            'inline-block bg-[#FFC107] text-black text-[13px] font-black uppercase tracking-[0.2em] px-6 sm:px-8 py-3 rounded-full',
                            className,
                          )}
                          {...props}
                        >
                          {children}
                        </h2>
                      </div>
                    );
                  },
                  h3: ({ className, ...props }: React.ComponentProps<'h3'>) => (
                    <h3
                      className={cn(
                        'text-lg sm:text-xl font-bold text-slate-800 mt-8 sm:mt-10 mb-4 uppercase tracking-wide',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  p: ({ className, ...props }: React.ComponentProps<'p'>) => (
                    <p
                      className={cn(
                        'text-base sm:text-[18px] leading-[1.8] text-slate-900 mb-6 sm:mb-8 font-normal',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  hr: () => <div className="h-[5px] bg-[#FF1493] w-48 mb-12" />,
                  ul: ({ className, ...props }: React.ComponentProps<'ul'>) => (
                    <ul className={cn('space-y-3 mb-8 sm:mb-10 list-none', className)} {...props} />
                  ),
                  ol: ({ className, ...props }: React.ComponentProps<'ol'>) => (
                    <ol className={cn('space-y-2 mb-8 sm:mb-10 list-none', className)} {...props} />
                  ),
                  li: ({ className, children, ...props }: React.ComponentProps<'li'>) => (
                    <li
                      className={cn(
                        'flex items-start gap-3 sm:gap-4 text-base sm:text-[18px] text-slate-900 leading-relaxed font-normal relative',
                        className,
                      )}
                      {...props}
                    >
                      <span className="text-[#FF1493] text-2xl leading-none mt-1 shrink-0">
                        •
                      </span>
                      <span className="flex-1 min-w-0">{children}</span>
                    </li>
                  ),
                  strong: ({ className, ...props }: React.ComponentProps<'strong'>) => (
                    <strong className={cn('font-bold text-black', className)} {...props} />
                  ),
                  table: ({ className, ...props }: React.ComponentProps<'table'>) => (
                    <div className="w-full my-8 sm:my-12 overflow-x-auto">
                      <table
                        className={cn('w-full border-collapse text-left min-w-full', className)}
                        {...props}
                      />
                    </div>
                  ),
                  th: ({ className, ...props }: React.ComponentProps<'th'>) => (
                    <th
                      className={cn(
                        'bg-slate-100 p-3 sm:p-5 text-left text-[12px] font-black uppercase tracking-widest border-b-2 border-slate-200',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  td: ({ className, ...props }: React.ComponentProps<'td'>) => (
                    <td
                      className={cn(
                        'p-3 sm:p-5 text-sm sm:text-[16px] border-b border-slate-50 text-slate-800 break-words',
                        className,
                      )}
                      style={{ minWidth: '120px' }}
                      {...props}
                    />
                  ),
                  blockquote: ({ className, ...props }: React.ComponentProps<'blockquote'>) => (
                    <blockquote
                      className={cn(
                        'border-l-[6px] sm:border-l-[8px] border-[#FF1493] pl-6 sm:pl-10 py-6 sm:py-8 italic bg-slate-50/50 rounded-r-3xl my-8 sm:my-12 text-xl sm:text-2xl text-slate-900 leading-relaxed',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  a: ({ href, children, className, ...props }: React.ComponentProps<'a'>) => {
                    const isInternal = href?.startsWith('#source-report-');
                    return (
                      <a
                        href={href}
                        target={isInternal ? '_self' : '_blank'}
                        rel={isInternal ? undefined : 'noopener noreferrer'}
                        className={cn(
                          'text-[hsl(var(--color-primary))] hover:underline cursor-pointer',
                          !isInternal && 'font-bold',
                          isInternal &&
                            'text-[12px] font-bold align-top bg-[hsl(var(--color-primary)/0.1)] px-1.5 rounded-md ml-0.5 inline-block -mt-1',
                          className,
                        )}
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {processCitations(content, 'report', structuredData?.news || [])}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pt-20 animate-in fade-in duration-1000">
              <div className="relative">
                <div className="absolute inset-0 bg-[hsl(var(--color-primary))] rounded-full blur-2xl opacity-20 animate-pulse" />
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] border-4 border-white overflow-hidden shadow-2xl relative z-10 bg-[hsl(var(--color-primary)/0.1)] grid place-items-center">
                  <Icon name="auto_awesome" className="text-[hsl(var(--color-primary))] text-[48px]" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  Generando informe
                </h3>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">
                    Creando tu informe estratégico
                  </p>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.3s]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Finished footer */}
        {!isThinking && content && (
          <div className="mx-4 sm:mx-6 mb-8 sm:mb-12 p-4 sm:p-6 bg-[hsl(var(--color-primary)/0.03)] border-2 border-[hsl(var(--color-primary)/0.1)] rounded-2xl sm:rounded-3xl flex items-center gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[hsl(var(--color-primary)/0.1)] grid place-items-center shrink-0">
              <Icon name="check_circle" className="text-[hsl(var(--color-primary))] text-2xl sm:text-3xl" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--color-primary))]">
                Tarea Finalizada
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tighter leading-none mt-1">
                El informe está terminado
              </p>
              <p className="text-xs text-slate-500 mt-1 sm:mt-2 font-medium truncate">
                Datos analizados y reporte estructurado para tu marca.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Download footer */}
      {!isThinking && content && (
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 relative">
          <div className="relative">
            <button
              onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-[hsl(var(--color-primary))] rounded-xl shadow-lg hover:shadow-[hsl(var(--color-primary)/0.3)] transition-all active:scale-95 min-h-[44px]"
            >
              <Icon name="download" className="text-lg" />
              <span className="hidden sm:inline">Descargar Informe</span>
              <span className="sm:hidden">Descargar</span>
            </button>

            {isDownloadMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                <button
                  onClick={handleDownloadPDF}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors min-h-[44px]"
                >
                  <Icon name="picture_as_pdf" className="text-rose-500" />
                  Descargar PDF
                </button>
                <button
                  onClick={handleDownloadWord}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-100 min-h-[44px]"
                >
                  <Icon name="description" className="text-blue-500" />
                  Descargar Word
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
