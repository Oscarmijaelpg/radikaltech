import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/utils/cn';
import { exportToPDF, exportToWord } from '@/shared/utils/exportUtils';
const processCitations = (content, idPrefix, newsArray = []) => {
    if (!content)
        return '';
    const sourceMap = {};
    if (newsArray && newsArray.length > 0) {
        newsArray.forEach((item, index) => {
            const num = (index + 1).toString();
            const url = item.url ||
                item.link ||
                item.url_fuente ||
                (typeof item.source === 'string' && item.source.startsWith('http') ? item.source : null);
            if (url)
                sourceMap[num] = url;
        });
    }
    content.split('\n').forEach((line) => {
        const numMatch = line.match(/^\s*(?:[-*+]\s*)?(?:\[)?(\d+)(?:\])?[.):\-\s]+/);
        if (numMatch?.[1]) {
            const num = numMatch[1];
            const urlMatch = line.match(/(https?:\/\/[^\s)\]'"<>]+)/);
            if (urlMatch?.[1])
                sourceMap[num] = urlMatch[1];
        }
    });
    const refRegex = /\[(\d+)\]:\s*(https?:\/\/[^\s)\]'"<>]+)/g;
    let match;
    while ((match = refRegex.exec(content)) !== null) {
        if (match[1] && match[2])
            sourceMap[match[1]] = match[2];
    }
    let text = content;
    text = text.replace(/^(\s*(?:[-*+]\s*)?(?:\[)?(\d+)(?:\])?[.):\-\s]+)(.*?)(https?:\/\/[^\s)\]'"<>]+)(.*?)$/gm, (fullLine, prefix, _num, titlePart, url, rest) => {
        if (fullLine.includes(`](${url})`))
            return fullLine;
        const cleanTitle = titlePart.replace(/[-–:]\s*$/, '').trim();
        return `${prefix}${cleanTitle ? cleanTitle + ' — ' : ''}[${url}](${url})${rest}`;
    });
    text = text.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (ogMatch, numsStr) => {
        const nums = numsStr.split(',').map((n) => n.trim());
        const links = nums.map((n) => {
            const url = sourceMap[n];
            if (url)
                return `[${n}](${url})`;
            return `[${n}](#source-${idPrefix}-${n})`;
        });
        return links.join(' ');
    });
    return text;
};
export function ReportPanel({ content, isThinking, onClose }) {
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const structuredData = useMemo(() => {
        if (isThinking || !content)
            return null;
        try {
            const jsonMatch = content.match(/<report_data>([\s\S]*?)<\/report_data>/) ||
                content.match(/```json\n([\s\S]*?)\n```/) ||
                content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const rawJson = jsonMatch[1] || jsonMatch[0];
                const data = JSON.parse(rawJson.trim());
                if (data.company_name || (data.news && Array.isArray(data.news))) {
                    return data;
                }
            }
        }
        catch {
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
            ? `Informe para: ${structuredData.company_name}\nFecha: ${structuredData.report_date}\n\nResumen:\n${structuredData.news
                ?.map((item) => `- ${item.title} (${item.source})`)
                .join('\n') ?? ''}`
            : content;
        await exportToWord(displayContent, title);
    };
    return (_jsxs("div", { className: "w-full flex flex-col bg-slate-50 border-l border-slate-200 animate-in slide-in-from-right duration-500 overflow-hidden h-full", children: [_jsxs("header", { className: "px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center", children: _jsx("span", { className: "material-symbols-outlined text-[hsl(var(--color-primary))] text-xl", children: "description" }) }), _jsxs("div", { children: [_jsx("h2", { className: "font-bold text-slate-900 leading-tight text-sm sm:text-base", children: "Informe Detallado" }), _jsx("p", { className: "text-[10px] text-slate-500 uppercase font-bold tracking-wider", children: "Generado por IA" })] })] }), _jsxs("div", { className: "flex items-center gap-2 sm:gap-4", children: [isThinking && (_jsxs("div", { className: "flex items-center gap-2 bg-[hsl(var(--color-primary)/0.05)] px-3 py-1 rounded-full border border-[hsl(var(--color-primary)/0.2)] shadow-sm", children: [_jsx("span", { className: "text-[10px] font-bold text-[hsl(var(--color-primary))] uppercase tracking-widest animate-pulse", children: "Analizando" }), _jsxs("div", { className: "flex gap-0.5", children: [_jsx("div", { className: "w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce" }), _jsx("div", { className: "w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]" })] })] })), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600", children: _jsx("span", { className: "material-symbols-outlined text-xl", children: "close" }) })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto bg-white", children: [_jsxs("div", { id: "report-content", className: "w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12 md:px-12 md:py-20", children: [_jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 sm:mb-12 border-b border-slate-100 pb-6 sm:pb-8", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "text-2xl sm:text-3xl font-black text-slate-900", children: ["RADIKAL", _jsx("span", { className: "text-[hsl(var(--color-primary))]", children: "IA" })] }), _jsx("p", { className: "text-[10px] font-black tracking-[0.2em] text-[hsl(var(--color-primary))] mt-1 uppercase", children: "Inteligencia Estrat\u00E9gica" })] }), _jsxs("div", { className: "text-left sm:text-right", children: [_jsx("div", { className: "text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1", children: "An\u00E1lisis Radikal IA" }), _jsx("div", { className: "text-[12px] font-bold text-slate-600", children: new Date().toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                }) })] })] }), content ? (_jsx("div", { className: "w-full text-black", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], components: {
                                        h1: ({ className, ...props }) => (_jsx("h1", { className: cn('text-3xl sm:text-5xl font-black text-black mb-2 tracking-tighter leading-tight', className), ...props })),
                                        h2: ({ className, children, ...props }) => {
                                            const text = typeof children === 'string' ? children : '';
                                            const isSources = /fuentes|sources|bibliograf/i.test(text);
                                            if (isSources) {
                                                return (_jsx("div", { className: "mt-12 sm:mt-16 mb-6", children: _jsxs("div", { className: "flex items-center gap-4 mb-2", children: [_jsx("span", { className: "h-px flex-1 bg-slate-200" }), _jsxs("h2", { className: cn('flex items-center gap-2 text-slate-500 text-[12px] font-black uppercase tracking-[0.3em] px-4', className), children: [_jsx("span", { className: "material-symbols-outlined text-[16px]", children: "link" }), children] }), _jsx("span", { className: "h-px flex-1 bg-slate-200" })] }) }));
                                            }
                                            return (_jsx("div", { className: "mt-10 sm:mt-14 mb-6 sm:mb-8", children: _jsx("h2", { className: cn('inline-block bg-[#FFC107] text-black text-[13px] font-black uppercase tracking-[0.2em] px-6 sm:px-8 py-3 rounded-full', className), ...props, children: children }) }));
                                        },
                                        h3: ({ className, ...props }) => (_jsx("h3", { className: cn('text-lg sm:text-xl font-bold text-slate-800 mt-8 sm:mt-10 mb-4 uppercase tracking-wide', className), ...props })),
                                        p: ({ className, ...props }) => (_jsx("p", { className: cn('text-base sm:text-[18px] leading-[1.8] text-slate-900 mb-6 sm:mb-8 font-normal', className), ...props })),
                                        hr: () => _jsx("div", { className: "h-[5px] bg-[#FF1493] w-48 mb-12" }),
                                        ul: ({ className, ...props }) => (_jsx("ul", { className: cn('space-y-3 mb-8 sm:mb-10 list-none', className), ...props })),
                                        ol: ({ className, ...props }) => (_jsx("ol", { className: cn('space-y-2 mb-8 sm:mb-10 list-none', className), ...props })),
                                        li: ({ className, children, ...props }) => (_jsxs("li", { className: cn('flex items-start gap-3 sm:gap-4 text-base sm:text-[18px] text-slate-900 leading-relaxed font-normal relative', className), ...props, children: [_jsx("span", { className: "text-[#FF1493] text-2xl leading-none mt-1 shrink-0", children: "\u2022" }), _jsx("span", { className: "flex-1 min-w-0", children: children })] })),
                                        strong: ({ className, ...props }) => (_jsx("strong", { className: cn('font-bold text-black', className), ...props })),
                                        table: ({ className, ...props }) => (_jsx("div", { className: "w-full my-8 sm:my-12 overflow-x-auto", children: _jsx("table", { className: cn('w-full border-collapse text-left min-w-full', className), ...props }) })),
                                        th: ({ className, ...props }) => (_jsx("th", { className: cn('bg-slate-100 p-3 sm:p-5 text-left text-[12px] font-black uppercase tracking-widest border-b-2 border-slate-200', className), ...props })),
                                        td: ({ className, ...props }) => (_jsx("td", { className: cn('p-3 sm:p-5 text-sm sm:text-[16px] border-b border-slate-50 text-slate-800 break-words', className), style: { minWidth: '120px' }, ...props })),
                                        blockquote: ({ className, ...props }) => (_jsx("blockquote", { className: cn('border-l-[6px] sm:border-l-[8px] border-[#FF1493] pl-6 sm:pl-10 py-6 sm:py-8 italic bg-slate-50/50 rounded-r-3xl my-8 sm:my-12 text-xl sm:text-2xl text-slate-900 leading-relaxed', className), ...props })),
                                        a: ({ href, children, className, ...props }) => {
                                            const isInternal = href?.startsWith('#source-report-');
                                            return (_jsx("a", { href: href, target: isInternal ? '_self' : '_blank', rel: isInternal ? undefined : 'noopener noreferrer', className: cn('text-[hsl(var(--color-primary))] hover:underline cursor-pointer', !isInternal && 'font-bold', isInternal &&
                                                    'text-[12px] font-bold align-top bg-[hsl(var(--color-primary)/0.1)] px-1.5 rounded-md ml-0.5 inline-block -mt-1', className), ...props, children: children }));
                                        },
                                    }, children: processCitations(content, 'report', structuredData?.news || []) }) })) : (_jsxs("div", { className: "h-full flex flex-col items-center justify-center text-center space-y-8 pt-20 animate-in fade-in duration-1000", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-[hsl(var(--color-primary))] rounded-full blur-2xl opacity-20 animate-pulse" }), _jsx("div", { className: "w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] border-4 border-white overflow-hidden shadow-2xl relative z-10 bg-[hsl(var(--color-primary)/0.1)] grid place-items-center", children: _jsx("span", { className: "material-symbols-outlined text-[hsl(var(--color-primary))] text-[48px]", children: "auto_awesome" }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter", children: "Generando informe" }), _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("p", { className: "text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]", children: "Creando tu informe estrat\u00E9gico" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce" }), _jsx("div", { className: "w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]" }), _jsx("div", { className: "w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.3s]" })] })] })] })] }))] }), !isThinking && content && (_jsxs("div", { className: "mx-4 sm:mx-6 mb-8 sm:mb-12 p-4 sm:p-6 bg-[hsl(var(--color-primary)/0.03)] border-2 border-[hsl(var(--color-primary)/0.1)] rounded-2xl sm:rounded-3xl flex items-center gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000", children: [_jsx("div", { className: "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[hsl(var(--color-primary)/0.1)] grid place-items-center shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[hsl(var(--color-primary))] text-2xl sm:text-3xl", children: "check_circle" }) }), _jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--color-primary))]", children: "Tarea Finalizada" }), _jsx("p", { className: "text-base sm:text-lg font-black text-slate-900 uppercase tracking-tighter leading-none mt-1", children: "El informe est\u00E1 terminado" }), _jsx("p", { className: "text-xs text-slate-500 mt-1 sm:mt-2 font-medium truncate", children: "Datos analizados y reporte estructurado para tu marca." })] })] }))] }), !isThinking && content && (_jsx("div", { className: "p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 relative", children: _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setIsDownloadMenuOpen(!isDownloadMenuOpen), className: "flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-[hsl(var(--color-primary))] rounded-xl shadow-lg hover:shadow-[hsl(var(--color-primary)/0.3)] transition-all active:scale-95 min-h-[44px]", children: [_jsx("span", { className: "material-symbols-outlined text-lg", children: "download" }), _jsx("span", { className: "hidden sm:inline", children: "Descargar Informe" }), _jsx("span", { className: "sm:hidden", children: "Descargar" })] }), isDownloadMenuOpen && (_jsxs("div", { className: "absolute bottom-full right-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50", children: [_jsxs("button", { onClick: handleDownloadPDF, className: "w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors min-h-[44px]", children: [_jsx("span", { className: "material-symbols-outlined text-rose-500", children: "picture_as_pdf" }), "Descargar PDF"] }), _jsxs("button", { onClick: handleDownloadWord, className: "w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-100 min-h-[44px]", children: [_jsx("span", { className: "material-symbols-outlined text-blue-500", children: "description" }), "Descargar Word"] })] }))] }) }))] }));
}
