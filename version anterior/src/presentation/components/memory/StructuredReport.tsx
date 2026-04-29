
import React from 'react';
import { Card } from '../ui/Card';

interface NewsItem {
    title: string | null;
    source: string | null;
    summary: string | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    impact_level: 'high' | 'medium' | 'low' | null;
}

export const StructuredReport: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;

    const getSentimentIcon = (sentiment: string | null) => {
        switch (sentiment?.toLowerCase()) {
            case 'positive': return 'trending_up';
            case 'negative': return 'trending_down';
            default: return 'horizontal_rule';
        }
    };

    const getSentimentStyles = (sentiment: string | null) => {
        switch (sentiment?.toLowerCase()) {
            case 'positive': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'negative': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
        }
    };

    const getImpactStyles = (impact: string | null) => {
        switch (impact?.toLowerCase()) {
            case 'high':
            case 'alto':
                return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'medium':
            case 'medio':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default:
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    // Helper to get data from either English or Spanish keys
    const market = data.market_analysis || data.analisis_mercado || {};
    const social = data.social_media_analysis || data.analisis_redes_sociales || data.analisis_rrss || {};
    const news = data.news || data.noticias || [];

    // Build a source map from available content strings to resolve citations not in news array
    const sourceMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        const textSources = [data.content, data.summary, data.analisis_completo].filter(s => typeof s === 'string');
        textSources.forEach(text => {
            text.split('\n').forEach(line => {
                const m = line.match(/(?:^|\s|\[)(\d+)(?:\s*[\.\:\]\-\)]+)\s*(https?:\/\/[^\s\)\]'"]+)/);
                if (m) map[m[1]] = m[2];
            });
        });
        return map;
    }, [data]);

    const renderTextWithCitations = (text: string | null | undefined) => {
        if (!text) return null;
        if (typeof text !== 'string') return text;

        // Split text by citations like [1], [2], [1, 2]
        const parts = text.split(/(\[\s*\d+(?:\s*,\s*\d+)*\s*\])/g);

        return parts.map((part, index) => {
            if (part.startsWith('[') && part.endsWith(']')) {
                // Extract numbers
                const numMatches = part.match(/\d+/g);
                if (numMatches) {
                    return (
                        <span key={index} className="inline-flex gap-0.5 whitespace-nowrap align-middle -mt-1 mx-0.5">
                            {numMatches.map((numStr, i) => {
                                const num = parseInt(numStr, 10);
                                const sourceIndex = num - 1;
                                const source = news[sourceIndex] || news.find((n: any, idx: number) => idx === sourceIndex || n.id === num || n.id === numStr);
                                
                                let url = sourceMap[numStr];
                                let titleAttr = `Fuente ${numStr}`;

                                if (source) {
                                    url = source.url || source.link || source.url_fuente || (typeof source.source === 'string' && source.source.startsWith('http') ? source.source : url);
                                    titleAttr = source.title || source.source || titleAttr;
                                }

                                if (!url) {
                                    // Fallback to Google search if no URL found
                                    const query = source ? (source.title || source.source || '') : `fuente ${numStr}`;
                                    url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                                }
                                
                                return (
                                    <React.Fragment key={i}>
                                        <a 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-1 py-0 rounded-[4px] bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-[11px] font-black hover:bg-[hsl(var(--color-primary)/1)] hover:text-white transition-all shadow-sm"
                                            title={titleAttr}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {num}
                                        </a>
                                        {i < numMatches.length - 1 && <span className="text-slate-400 text-[10px] mx-0.5">,</span>}
                                    </React.Fragment>
                                );
                            })}
                        </span>
                    );
                }
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-1000">
            {/* Header Info - Premium Glassmorphism */}
            <div className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--color-primary)/0.05)] to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-200/50 shadow-2xl shadow-slate-200/20 ">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-[hsl(var(--color-primary))] rounded-full"></div>
                            <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">
                                {data.company_name || data.nombre_empresa || 'Informe Estratégico'}
                            </h2>
                        </div>
                        <p className="text-slate-500 font-medium ml-4.5">
                            Generado el {data.report_date || data.fecha_informe || 'recientemente'}
                        </p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {(social.overall_sentiment || social.sentimiento_general) && (
                            <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-2 font-bold text-xs uppercase tracking-wider shadow-sm transition-transform hover:scale-105 ${getSentimentStyles(social.overall_sentiment || social.sentimiento_general)}`}>
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                <span>Sentimiento: {social.overall_sentiment || social.sentimiento_general}</span>
                            </div>
                        )}
                        {(market.trend || market.tendencia) && (
                            <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-2 font-bold text-xs uppercase tracking-wider bg-blue-500/5 text-blue-600 border-blue-500/20 shadow-sm transition-transform hover:scale-105`}>
                                <span className="material-symbols-outlined text-[18px]">analytics</span>
                                <span>Tendencia: {market.trend || market.tendencia}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Main Content - News Section */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black flex items-center gap-3 text-slate-800 tracking-tight">
                            <div className="p-2 bg-[hsl(var(--color-primary)/0.1)] rounded-xl">
                                <span className="material-symbols-outlined text-[hsl(var(--color-primary))] block">newspaper</span>
                            </div>
                            {news.length > 0 ? 'Noticias y Actualizaciones' : 'Análisis Detallado'}
                        </h3>
                        {news.length > 0 && (
                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">
                                {news.length} Artículos
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {Array.isArray(news) && news.map((item: any, i: number) => (
                            <Card key={i} className="group p-6 flex flex-col gap-4 hover:translate-x-2 transition-all duration-300 bg-white border-slate-200/60 hover:shadow-2xl hover:shadow-[hsl(var(--color-primary)/0.05)] ">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-[hsl(var(--color-primary)/0.1)] transition-colors">
                                            <span className="material-symbols-outlined text-xs text-slate-400 group-hover:text-[hsl(var(--color-primary))] transition-colors">public</span>
                                        </div>
                                        {(() => {
                                            const url = item.url || item.link || item.url_fuente || (typeof item.source === 'string' && item.source.startsWith('http') ? item.source : `https://www.google.com/search?q=${encodeURIComponent((item.title || '') + ' ' + (item.source || ''))}`);
                                            return (
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-[hsl(var(--color-primary))] transition-colors cursor-pointer z-10" onClick={(e) => e.stopPropagation()}>
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 group-hover:bg-[hsl(var(--color-primary)/0.1)] group-hover:text-[hsl(var(--color-primary))] transition-colors">
                                                        [{i + 1}]
                                                    </span>
                                                    <span className="truncate max-w-[150px] sm:max-w-xs">{item.source || item.fuente || 'Fuente externa'}</span>
                                                    <span className="material-symbols-outlined text-[12px] opacity-70">open_in_new</span>
                                                </a>
                                            );
                                        })()}
                                    </div>
                                    {(item.impact_level || item.nivel_impacto) && (
                                        <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border tracking-wider ${getImpactStyles(item.impact_level || item.nivel_impacto)}`}>
                                            Impacto {item.impact_level || item.nivel_impacto}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-[hsl(var(--color-primary))] transition-colors">
                                        {item.title || item.titulo}
                                    </h4>
                                    <div className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                        {renderTextWithCitations(item.summary || item.resumen || item.content || item.contenido)}
                                    </div>
                                </div>
                                {(item.sentiment || item.sentimiento) && (
                                    <div className={`self-start mt-2 px-4 py-2 rounded-full text-[11px] font-black flex items-center gap-2 border shadow-sm ${getSentimentStyles(item.sentiment || item.sentimiento)}`}>
                                        <span className="material-symbols-outlined text-[16px]">{getSentimentIcon(item.sentiment || item.sentimiento)}</span>
                                        <span className="uppercase tracking-tight">{item.sentiment || item.sentimiento}</span>
                                    </div>
                                )}
                            </Card>
                        ))}

                        {!news.length && (data.content || data.summary || data.analisis_completo) && (
                            <Card className="p-8 bg-white border-slate-200 shadow-xl">
                                <div className="text-slate-700 text-lg leading-[1.8] whitespace-pre-wrap">
                                    {renderTextWithCitations(data.content || data.summary || data.analisis_completo)}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Sidebar - Precise Analysis */}
                <div className="xl:col-span-4 space-y-10">
                    {/* Market Analysis */}
                    {(market.key_points || market.puntos_clave || market.risks || market.riesgos || market.opportunities || market.oportunidades) && (
                        <section className="space-y-6">
                            <h3 className="text-xl font-black flex items-center gap-3 text-slate-800 uppercase tracking-tighter">
                                <span className="material-symbols-outlined text-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)] p-2 rounded-xl">insights</span>
                                Mercado
                            </h3>
                            <div className="space-y-6">
                                {(market.key_points || market.puntos_clave) && (
                                    <Card className="p-6 bg-slate-50/50 border-none shadow-none">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            Puntos Clave
                                        </p>
                                        <ul className="space-y-4">
                                            {(market.key_points || market.puntos_clave).map((pt: string, i: number) => (
                                                <li key={i} className="flex gap-3 text-[14px] font-medium text-slate-700 leading-relaxed items-start group">
                                                    <span className="material-symbols-outlined text-emerald-500 text-[18px] shrink-0 group-hover:scale-110 transition-transform">check_circle</span>
                                                    {pt}
                                                </li>
                                            ))}
                                        </ul>
                                    </Card>
                                )}

                                <div className="grid grid-cols-1 gap-6">
                                    {(market.risks || market.riesgos) && (
                                        <div className="bg-rose-500/5 p-6 rounded-[1.5rem] border border-rose-500/10">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">warning</span>
                                                Riesgos
                                            </p>
                                            <ul className="space-y-3">
                                                {(market.risks || market.riesgos).map((r: string, i: number) => (
                                                    <li key={i} className="text-xs font-semibold text-slate-600 flex gap-3 leading-relaxed">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                                                        {r}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {(market.opportunities || market.oportunidades) && (
                                        <div className="bg-emerald-500/5 p-6 rounded-[1.5rem] border border-emerald-500/10">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                                Oportunidades
                                            </p>
                                            <ul className="space-y-3">
                                                {(market.opportunities || market.oportunidades).map((o: string, i: number) => (
                                                    <li key={i} className="text-xs font-semibold text-slate-600 flex gap-3 leading-relaxed">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                                                        {o}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Social Media Analysis */}
                    {(social.engagement_level || social.nivel_engagement || social.main_topics || social.temas_principales) && (
                        <section className="space-y-6">
                            <h3 className="text-xl font-black flex items-center gap-3 text-slate-800 uppercase tracking-tighter">
                                <span className="material-symbols-outlined text-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)] p-2 rounded-xl">share</span>
                                Redes Sociales
                            </h3>
                            <Card className="p-8 bg-gradient-to-br from-[hsl(var(--color-primary)/0.08)] via-white to-white border-slate-200/50 rounded-[2rem] overflow-hidden relative shadow-xl shadow-slate-200/40 ">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--color-primary))] opacity-[0.03] rounded-bl-full"></div>
                                
                                <div className="relative flex items-center justify-between mb-8">
                                    <div>
                                        <p className="text-11px font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Engagement</p>
                                        <p className="text-3xl font-black text-slate-900 uppercase leading-none tracking-tighter">
                                            {social.engagement_level || social.nivel_engagement || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
                                        <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-3xl">favorite</span>
                                    </div>
                                </div>

                                {(social.main_topics || social.temas_principales) && (
                                    <div className="relative space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Temas Destacados</p>
                                        <div className="flex flex-wrap gap-2.5">
                                            {(social.main_topics || social.temas_principales).map((topic: string, i: number) => (
                                                <span key={i} className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-slate-100 rounded-xl text-[11px] font-bold text-slate-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                                                    #{topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </section>
                    )}
                </div>
            </div>

            {/* Catch-all for extra data - Integrated Grid */}
            {Object.keys(data).filter(k => !['news', 'noticias', 'market_analysis', 'analisis_mercado', 'social_media_analysis', 'analisis_redes_sociales', 'company_name', 'nombre_empresa', 'report_date', 'fecha_informe', 'content', 'summary', 'analisis_completo'].includes(k)).length > 0 && (
                <div className="mt-16 pt-10 border-t border-slate-200 ">
                    <div className="flex items-center gap-4 mb-8">
                        <span className="h-px flex-1 bg-slate-200 "></span>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 px-4">Anexos Adicionales</p>
                        <span className="h-px flex-1 bg-slate-200 "></span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(data).filter(([k]) => !['news', 'noticias', 'market_analysis', 'analisis_mercado', 'social_media_analysis', 'analisis_redes_sociales', 'company_name', 'nombre_empresa', 'report_date', 'fecha_informe', 'content', 'summary', 'analisis_completo'].includes(k)).map(([k, v]: [string, any]) => (
                            <div key={k} className="group bg-white p-6 rounded-[1.5rem] border border-slate-100 hover:border-[hsl(var(--color-primary)/0.2)] transition-all flex flex-col gap-3">
                                <p className="text-[10px] font-black text-[hsl(var(--color-primary))] uppercase tracking-widest">{k.replace(/_/g, ' ')}</p>
                                <div className="text-sm text-slate-600 font-medium leading-relaxed">
                                    {typeof v === 'string' ? v : (
                                        <pre className="text-[10px] bg-slate-50 p-3 rounded-lg overflow-x-auto custom-scrollbar">
                                            {JSON.stringify(v, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
