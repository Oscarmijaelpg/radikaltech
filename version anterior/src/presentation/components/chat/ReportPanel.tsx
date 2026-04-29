
import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StructuredReport } from '../memory/StructuredReport';
import { exportToPDF, exportToWord } from '../../utils/exportUtils';

interface ReportPanelProps {
    content: string;
    isThinking: boolean;
    onClose: () => void;
}

import clsx from 'clsx';
import KronosProfile from '../../../media/kronos_profile.webp';

// Extracts all (number -> URL) pairs from the content using multiple strategies
const buildSourceMap = (content: string, newsArray: any[] = []): Record<string, string> => {
    const sourceMap: Record<string, string> = {};

    // Strategy 1: From structured news array (highest priority)
    if (newsArray && newsArray.length > 0) {
        newsArray.forEach((item, index) => {
            const num = (index + 1).toString();
            const url = item.url || item.link || item.url_fuente
                || (typeof item.source === 'string' && item.source.startsWith('http') ? item.source : null);
            if (url) sourceMap[num] = url;
        });
    }

    const lines = content.split('\n');

    // Strategy 2: For each line, extract number + any URL on the SAME line (two-pass per line)
    // This handles: "1. [Title] - https://url", "[1] https://url", "1. https://url", etc.
    lines.forEach(line => {
        const numMatch = line.match(/^\s*(?:[\-\*\+]\s*)?(?:\[)?(\d+)(?:\])?[\.\)\:\-\s]+/);
        if (numMatch) {
            const num = numMatch[1];
            // Find any URL on this line
            const urlMatch = line.match(/(https?:\/\/[^\s\)\]'"<>]+)/);
            if (urlMatch) {
                sourceMap[num] = urlMatch[1];
            }
        }
    });

    // Strategy 3: Markdown reference style [1]: https://url
    const refRegex = /\[(\d+)\]:\s*(https?:\/\/[^\s\)\]'"<>]+)/g;
    let match;
    while ((match = refRegex.exec(content)) !== null) {
        sourceMap[match[1]] = match[2];
    }

    return sourceMap;
};

// Pre-processes content to make bare URLs in source lists into markdown links
// and converts inline citation numbers to links
const processCitations = (content: string, idPrefix: string, newsArray: any[] = []) => {
    if (!content) return '';
    const sourceMap = buildSourceMap(content, newsArray);

    let text = content;

    // Pass 1: Convert bare URLs in lines that are source list items into proper markdown links
    // Pattern: lines starting with a number followed by optional title then URL
    text = text.replace(
        /^(\s*(?:[\-\*\+]\s*)?(?:\[)?(\d+)(?:\])?[\.\)\:\-\s]+)(.*?)(https?:\/\/[^\s\)\]'"<>]+)(.*?)$/gm,
        (fullLine, prefix, num, titlePart, url, rest) => {
            // If there's already a markdown link pattern, don't double-wrap
            if (fullLine.includes(`](${url})`)) return fullLine;
            // Wrap the URL as a clickable markdown link preserving the rest
            const cleanTitle = titlePart.replace(/[-–:]\s*$/, '').trim();
            const linkText = cleanTitle.length > 2 ? cleanTitle : url;
            return `${prefix}${cleanTitle ? cleanTitle + ' — ' : ''}[${url}](${url})${rest}`;
        }
    );

    // Pass 2: Convert inline citation badges [1], [1, 2] to markdown links
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

export const ReportPanel: React.FC<ReportPanelProps> = ({ content, isThinking, onClose }) => {
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

    // Try to extract and parse structured data if present
    const structuredData = useMemo(() => {
        if (isThinking || !content) return null;
        try {
            // Look for JSON block or specific tags
            const jsonMatch = content.match(/<report_data>([\s\S]*?)<\/report_data>/) ||
                content.match(/```json\n([\s\S]*?)\n```/) ||
                content.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const rawJson = jsonMatch[1] || jsonMatch[0];
                const data = JSON.parse(rawJson.trim());
                // Basic validation for the StructuredReport format
                if (data.company_name || (data.news && Array.isArray(data.news))) {
                    return data;
                }
            }
        } catch (e) {
            console.warn("Failed to parse structured report data", e);
        }
        return null;
    }, [content, isThinking]);

    const handleDownloadPDF = async () => {
        setIsDownloadMenuOpen(false);
        const fileName = structuredData?.company_name
            ? `reporte-${structuredData.company_name.toLowerCase()}.pdf`
            : 'reporte-radikal.pdf';
        await exportToPDF('report-content', fileName, structuredData);
    };

    const handleDownloadWord = async () => {
        setIsDownloadMenuOpen(false);
        const title = structuredData?.company_name
            ? `Informe Estratégico - ${structuredData.company_name}`
            : 'Informe Detallado Radikal IA';

        // Clean content for word (remove JSON if structured)
        const displayContent = structuredData
            ? `Informe para: ${structuredData.company_name}\nFecha: ${structuredData.report_date}\n\nResumen de Noticias:\n${structuredData.news.map((item: any) => `- ${item.title} (${item.source})`).join('\n')}`
            : content;

        await exportToWord(displayContent, title);
    };

    return (
        <div className="w-full flex flex-col bg-slate-50 border-l border-slate-200 animate-in slide-in-from-right duration-500 overflow-hidden h-full">
            <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-xl">description</span>
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 leading-tight">Informe Detallado</h2>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Generado por IA</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isThinking && (
                        <div className="flex items-center gap-2 bg-[hsl(var(--color-primary)/0.05)] px-3 py-1 rounded-full border border-[hsl(var(--color-primary)/0.2)] shadow-sm">
                            <div className="w-5 h-5 rounded-full overflow-hidden border border-[hsl(var(--color-primary))] flex-shrink-0">
                                <img src={KronosProfile} alt="K" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] font-bold text-[hsl(var(--color-primary))] uppercase tracking-widest animate-pulse">Kronos Analizando</span>
                            <div className="flex gap-0.5">
                                <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce"></div>
                                <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]"></div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600 "
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white ">
                <div id="report-content" className="w-full max-w-5xl mx-auto px-6 py-12 md:px-12 md:py-20">
                    {/* Reference Header */}
                    <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
                        <div className="flex flex-col gap-1">
                            <img src="/radikal-logo-dark.png" alt="Radikal" className="h-10 w-auto object-contain " onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }} />
                            <p className="text-[10px] font-black tracking-[0.2em] text-[hsl(var(--color-primary))] mt-2 uppercase">Inteligencia Estratégica</p>
                        </div>
                        <div className="report-metadata text-right">
                            <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Análisis Radikal IA</div>
                            <div className="text-[12px] font-bold text-slate-600 ">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>

                    {content ? (
                        structuredData ? (
                            <StructuredReport data={structuredData} />
                        ) : (
                            <div className="w-full text-black">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ className, node, ...props }: any) => <h1 className={clsx("text-5xl font-black text-black mb-2 tracking-tighter leading-tight", className)} {...props} />,
                                        h2: ({ className, node, children, ...props }: any) => {
                                            const text = typeof children === 'string' ? children : '';
                                            const isSources = /fuentes|sources|bibliograf/i.test(text);
                                            if (isSources) {
                                                return (
                                                    <div className="mt-16 mb-6" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                                        <div className="flex items-center gap-4 mb-2">
                                                            <span className="h-px flex-1 bg-slate-200"></span>
                                                            <h2 className={clsx("flex items-center gap-2 text-slate-500 text-[12px] font-black uppercase tracking-[0.3em] px-4", className)}>
                                                                <span className="material-symbols-outlined text-[16px]">link</span>
                                                                {children}
                                                            </h2>
                                                            <span className="h-px flex-1 bg-slate-200"></span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="mt-14 mb-8" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                                    <h2 className={clsx("inline-block bg-[#FFC107] text-black text-[13px] font-black uppercase tracking-[0.2em] px-8 py-3 rounded-full", className)} {...props}>
                                                        {children}
                                                    </h2>
                                                </div>
                                            );
                                        },
                                        h3: ({ className, node, ...props }: any) => <h3 className={clsx("text-xl font-bold text-slate-800 mt-10 mb-4 uppercase tracking-wide", className)} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }} {...props} />,
                                        p: ({ className, node, ...props }: any) => <p className={clsx("text-[18px] leading-[1.8] text-slate-900 mb-8 font-normal", className)} {...props} />,
                                        hr: () => <div className="h-[5px] bg-[#FF1493] w-48 mb-12" />,
                                        ul: ({ className, node, ...props }: any) => <ul className={clsx("space-y-3 mb-10 list-none", className)} {...props} />,
                                        ol: ({ className, node, ...props }: any) => <ol className={clsx("space-y-2 mb-10 list-none", className)} {...props} />,
                                        li: ({ className, node, children, ...props }: any) => {
                                            let anchorId: string | undefined = undefined;
                                            const childArray = React.Children.toArray(children);
                                            const firstChild = childArray[0];

                                            // Try to detect source list items (lines starting with a number)
                                            let isSourceItem = false;
                                            const getDeepText = (c: any): string => {
                                                if (typeof c === 'string') return c;
                                                if (Array.isArray(c)) return c.map(getDeepText).join('');
                                                if (React.isValidElement(c)) return getDeepText((c.props as any).children);
                                                return '';
                                            };
                                            const textContent = getDeepText(children);

                                            if (typeof firstChild === 'string') {
                                                const m = firstChild.match(/^(\d+)[\.\:\s]+/);
                                                if (m) {
                                                    anchorId = `source-report-${m[1]}`;
                                                    isSourceItem = true;
                                                }
                                            }

                                            return (
                                                <li
                                                    id={anchorId}
                                                    className={clsx(
                                                        "flex items-start gap-4 text-[18px] text-slate-900 leading-relaxed font-normal relative",
                                                        isSourceItem && "py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-none",
                                                        className
                                                    )}
                                                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                                                    {...props}
                                                >
                                                    {isSourceItem
                                                        ? <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-[13px] font-black mt-0.5">
                                                            {textContent.match(/^(\d+)/)?.[1]}
                                                          </span>
                                                        : <span className="text-[#FF1493] text-2xl leading-none mt-1">•</span>
                                                    }
                                                    <span className="flex-1 min-w-0">{children}</span>
                                                </li>
                                            );
                                        },
                                        strong: ({ className, node, ...props }: any) => <strong className={clsx("font-bold text-black ", className)} {...props} />,
                                        table: ({ className, node, ...props }: any) => <div className="w-full my-12 custom-scrollbar isolate overflow-x-auto overflow-y-auto max-h-[75vh]"><table className={clsx("w-full border-collapse text-left min-w-full relative", className)} {...props} /></div>,
                                        thead: ({ className, node, ...props }: any) => <thead className={clsx("", className)} {...props} />,
                                        th: ({ className, node, ...props }: any) => <th className={clsx("bg-slate-100 p-5 text-left text-[12px] font-black uppercase tracking-widest border-b-2 border-slate-200 sticky top-0 z-[30] shadow-sm", className)} style={{ top: 0, position: 'sticky', backgroundClip: 'padding-box' }} {...props} />,
                                        td: ({ className, node, ...props }: any) => <td className={clsx("p-5 text-[16px] border-b border-slate-50 text-slate-800 break-words", className)} style={{ minWidth: '150px' }} {...props} />,
                                        blockquote: ({ className, node, ...props }: any) => (
                                            <blockquote className={clsx("border-l-[8px] border-[#FF1493] pl-10 py-8 italic bg-slate-50/50 rounded-r-3xl my-12 text-2xl text-slate-900 leading-relaxed", className)} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }} {...props} />
                                        ),
                                        a: ({ href, children, className, node, ...props }: any) => {
                                            const isInternal = href?.startsWith('#source-report-');
                                            return (
                                                <a
                                                    href={href}
                                                    target={isInternal ? "_self" : "_blank"}
                                                    rel={isInternal ? "" : "noopener noreferrer"}
                                                    onClick={(e) => {
                                                        if (isInternal) {
                                                            e.preventDefault();
                                                            const targetId = href.slice(1);
                                                            const target = document.getElementById(targetId);
                                                            if (target) {
                                                                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                target.classList.add('bg-[#FF1493]/10', 'transition-colors', 'duration-500');
                                                                setTimeout(() => target.classList.remove('bg-[#FF1493]/10'), 2000);
                                                            }
                                                        }
                                                    }}
                                                    className={clsx(
                                                        "text-[hsl(var(--color-primary))] hover:underline cursor-pointer",
                                                        !isInternal && "font-bold",
                                                        isInternal && "text-[12px] font-bold align-top bg-[hsl(var(--color-primary)/0.1)] px-1.5 rounded-md ml-0.5 inline-block -mt-1",
                                                        className
                                                    )}
                                                    {...props}
                                                >
                                                    {children}
                                                </a>
                                            );
                                        }
                                    }}
                                >
                                    {processCitations(content, 'chat-report', structuredData?.news || [])}
                                </ReactMarkdown>
                            </div>
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pt-20 animate-in fade-in duration-1000">
                            {/* Kronos Loading State */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-[hsl(var(--color-primary))] rounded-full blur-2xl opacity-20 animate-pulse"></div>
                                <div className="w-32 h-32 rounded-[2rem] border-4 border-white overflow-hidden shadow-2xl relative z-10 animate-bounce">
                                    <img src={KronosProfile} alt="Kronos" className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center z-20 border border-slate-100 ">
                                    <span className="material-symbols-outlined text-[hsl(var(--color-primary))] animate-spin">sync</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Kronos está trabajando</h3>
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Creando tu informe estratégico</p>
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce"></div>
                                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.3s]"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="max-w-xs p-4 bg-slate-50 rounded-2xl border border-slate-100 opacity-60">
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                    "Analizando datos masivos y estructurando tu reporte personalizado. Este proceso puede tomar unos segundos..."
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Report Finished Footer with Kronos */}
                {!isThinking && content && (
                    <div className="mx-6 mb-12 p-6 bg-[hsl(var(--color-primary)/0.03)] border-2 border-[hsl(var(--color-primary)/0.1)] rounded-3xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[hsl(var(--color-primary))] rounded-2xl blur-xl opacity-10 animate-pulse"></div>
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[hsl(var(--color-primary))] bg-white relative z-10 shadow-lg">
                                <img src={KronosProfile} alt="Kronos" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-20">
                                <span className="material-symbols-outlined text-white text-[10px] font-bold">check</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--color-primary))]">Tarea Finalizada</span>
                                <div className="h-px w-8 bg-[hsl(var(--color-primary)/0.3)]"></div>
                            </div>
                            <p className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">El informe estratégico está terminado</p>
                            <p className="text-xs text-slate-500 mt-2 font-medium">He analizado todos los datos y estructurado el reporte final para tu marca.</p>
                        </div>
                    </div>
                )}
            </div>

            {!isThinking && content && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 relative">
                    <div className="relative">
                        <button
                            onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-[hsl(var(--color-primary))] rounded-xl shadow-lg hover:shadow-[hsl(var(--color-primary)/0.3)] transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            Descargar Informe
                        </button>

                        {isDownloadMenuOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-rose-500">picture_as_pdf</span>
                                    Descargar PDF
                                </button>
                                <button
                                    onClick={handleDownloadWord}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-100 "
                                >
                                    <span className="material-symbols-outlined text-blue-500">description</span>
                                    Descargar Word
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
