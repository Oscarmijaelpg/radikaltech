import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import type { ToolChipState } from './MessageBubble';
import { Icon } from '@radikal/ui';
import { ImageAnalysisDialog } from '@/features/content/components/ImageAnalysisDialog';

interface Props {
  tool: ToolChipState;
  onOpenReport?: (content: string) => void;
  onQuickPrompt?: (text: string) => void;
}

export function ToolResultCard({ tool, onOpenReport, onQuickPrompt }: Props) {
  const [previewAsset, setPreviewAsset] = useState<{ asset_url: string; ai_description?: string } | null>(null);

  if (tool.status !== 'done' || !tool.data) return null;

  let content = null;
  switch (tool.name) {
    case 'generate_image':
      content = <ImageResultCard data={tool.data} onPreview={() => setPreviewAsset({ asset_url: tool.data!.url as string, ai_description: tool.resultSummary })} />;
      break;
    case 'propose_image':
      content = <ImageProposalCard data={tool.data} onQuickPrompt={onQuickPrompt} />;
      break;
    case 'search_news':
      content = <NewsResultCard data={tool.data} />;
      break;
    case 'find_trends':
      content = <TrendsResultCard data={tool.data} />;
      break;
    case 'get_competitor_data':
      content = <CompetitorDataCard data={tool.data} />;
      break;
    case 'get_brand_profile':
      content = <BrandProfileCard data={tool.data} />;
      break;
    case 'evaluate_content':
      content = <ContentEvalCard data={tool.data} />;
      break;
    case 'analyze_website':
      content = <WebsiteAnalysisCard data={tool.data} />;
      break;
    case 'generate_report':
      content = <ReportCreatedCard data={tool.data} onOpenReport={onOpenReport} />;
      break;
    case 'detect_markets':
      content = <MarketsCard data={tool.data} />;
      break;
    default:
      content = null;
  }

  return (
    <>
      {content}
      <ImageAnalysisDialog 
        asset={previewAsset} 
        open={!!previewAsset} 
        onOpenChange={(o) => !o && setPreviewAsset(null)} 
      />
    </>
  );
}

function CardWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 sm:p-4 my-2 not-prose overflow-hidden', className)}>
      {children}
    </div>
  );
}

function ImageResultCard({ data, onPreview }: { data: Record<string, unknown>; onPreview: () => void }) {
  const url = data.url as string | undefined;
  if (!url) return null;
  return (
    <CardWrapper className="max-w-[320px]">
      <div 
        className="rounded-xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow group relative"
        onClick={onPreview}
      >
        <img src={url} alt="Imagen generada" className="w-full h-[180px] object-cover transition-transform group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-[10px] font-black uppercase tracking-widest border border-white/40 px-3 py-1.5 rounded-full backdrop-blur-sm">Expandir Análisis</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase tracking-tighter">
          <Icon name="palette" className="text-[12px]" />
          Imagen IA
        </p>
        <button onClick={onPreview} className="text-[10px] font-black text-[hsl(var(--color-primary))] hover:underline uppercase tracking-tighter">
          Ver detalles
        </button>
      </div>
    </CardWrapper>
  );
}

function NewsResultCard({ data }: { data: Record<string, unknown> }) {
  const items = data.items as Array<{ title: string; source?: string; url?: string; summary?: string }> | undefined;
  if (!items?.length) return null;
  return (
    <CardWrapper>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center text-white">
          <Icon name="newspaper" className="text-[16px]" />
        </div>
        <p className="text-xs font-bold text-slate-700">{items.length} noticias encontradas</p>
      </div>
      <div className="space-y-2">
        {items.slice(0, 4).map((item, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-white border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 mt-0.5 shrink-0">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 line-clamp-2">{item.title}</p>
              {item.source && <p className="text-[10px] text-slate-400 mt-0.5">{item.source}</p>}
            </div>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="shrink-0 text-cyan-600 hover:text-cyan-700">
                <Icon name="open_in_new" className="text-[14px]" />
              </a>
            )}
          </div>
        ))}
      </div>
    </CardWrapper>
  );
}

function TrendsResultCard({ data }: { data: Record<string, unknown> }) {
  const trends = data.trends as Array<{
    name: string;
    momentum: string;
    relevance_score: number;
    description: string;
    suggested_action: string;
  }> | undefined;
  if (!trends?.length) return null;

  const momentumColors: Record<string, string> = {
    rising: 'bg-emerald-100 text-emerald-700',
    peaking: 'bg-amber-100 text-amber-700',
    cooling: 'bg-slate-100 text-slate-600',
  };

  return (
    <CardWrapper>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 grid place-items-center text-white">
          <Icon name="trending_up" className="text-[16px]" />
        </div>
        <p className="text-xs font-bold text-slate-700">{trends.length} tendencias detectadas</p>
      </div>
      <div className="space-y-2">
        {trends.slice(0, 5).map((t, i) => (
          <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-bold text-slate-800 flex-1">{t.name}</p>
              <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', momentumColors[t.momentum] ?? 'bg-slate-100 text-slate-600')}>
                {t.momentum}
              </span>
              <span className="text-[10px] font-bold text-violet-600">{t.relevance_score}/100</span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
          </div>
        ))}
      </div>
    </CardWrapper>
  );
}

function CompetitorDataCard({ data }: { data: Record<string, unknown> }) {
  if (data.competitors) {
    const comps = data.competitors as Array<{ name: string; engagement?: Record<string, unknown> }>;
    return (
      <CardWrapper>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 grid place-items-center text-white">
            <Icon name="groups" className="text-[16px]" />
          </div>
          <p className="text-xs font-bold text-slate-700">{comps.length} competidores</p>
        </div>
        <div className="space-y-1.5">
          {comps.slice(0, 5).map((c, i) => {
            const eng = c.engagement as Record<string, unknown> | null;
            return (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center text-slate-600 shrink-0">
                  <span className="text-xs font-bold">{c.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                  {eng && (
                    <p className="text-[10px] text-slate-400">
                      {String(eng.total_posts ?? 0)} posts · avg eng {typeof eng.avg_engagement === 'number' ? String(Math.round(eng.avg_engagement)) : 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardWrapper>
    );
  }

  const name = data.name as string | undefined;
  const engagement = data.engagement as Record<string, unknown> | null;
  const topPosts = data.topPosts as Array<{ platform: string; likes: number; caption?: string }> | undefined;

  return (
    <CardWrapper>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 grid place-items-center text-white">
          <Icon name="person_search" className="text-[16px]" />
        </div>
        <p className="text-xs font-bold text-slate-700">{name ?? 'Competidor'}</p>
      </div>
      {engagement && (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
          {[
            { label: 'Posts', value: engagement.total_posts },
            { label: 'Avg Likes', value: typeof engagement.avg_likes === 'number' ? Math.round(engagement.avg_likes) : 'N/A' },
            { label: 'Avg Eng', value: typeof engagement.avg_engagement === 'number' ? Math.round(engagement.avg_engagement) : 'N/A' },
          ].map((s) => (
            <div key={s.label} className="text-center p-2 rounded-xl bg-white border border-slate-100">
              <p className="text-lg font-black text-slate-800">{String(s.value ?? 0)}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {topPosts && topPosts.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Top posts</p>
          {topPosts.slice(0, 3).map((p, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-50 text-[11px]">
              <span className="font-semibold text-slate-500">{p.platform}</span>
              <span className="text-slate-400">·</span>
              <span className="text-rose-600 font-bold">{p.likes} ❤️</span>
              <span className="text-slate-600 truncate flex-1">{p.caption?.slice(0, 60)}</span>
            </div>
          ))}
        </div>
      )}
    </CardWrapper>
  );
}

function BrandProfileCard({ data }: { data: Record<string, unknown> }) {
  const project = data.project as Record<string, unknown> | null;
  const brand = data.brand as Record<string, unknown> | null;
  if (!project) return null;

  return (
    <CardWrapper>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 grid place-items-center text-white">
          <Icon name="badge" className="text-[16px]" />
        </div>
        <p className="text-xs font-bold text-slate-700">{(project.name as string) ?? 'Tu marca'}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {typeof project.industry === 'string' && project.industry ? (
          <div className="p-2 rounded-xl bg-white border border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Industria</p>
            <p className="text-slate-700 font-semibold">{project.industry}</p>
          </div>
        ) : null}
        {brand && typeof brand.voice_tone === 'string' && brand.voice_tone ? (
          <div className="p-2 rounded-xl bg-white border border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Tono</p>
            <p className="text-slate-700 font-semibold truncate">{brand.voice_tone}</p>
          </div>
        ) : null}
        {brand && Array.isArray(brand.values) && brand.values.length > 0 ? (
          <div className="p-2 rounded-xl bg-white border border-slate-100 col-span-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Valores</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(brand.values as string[]).slice(0, 5).map((v: string, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-semibold">{v}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </CardWrapper>
  );
}

function ContentEvalCard({ data }: { data: Record<string, unknown> }) {
  const score = data.score as number | undefined;
  const feedback = data.feedback as string | undefined;
  const tags = data.tags as string[] | undefined;
  if (score === undefined) return null;

  const scoreColor = score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-rose-600';

  return (
    <CardWrapper>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center text-white shadow-md">
          <span className={cn('text-2xl font-black', scoreColor.replace('text-', 'text-white '))}>{score}</span>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-700">Score estético</p>
          <p className="text-[10px] text-slate-400">de 10 puntos</p>
        </div>
      </div>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.slice(0, 8).map((t, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">{t}</span>
          ))}
        </div>
      )}
      {feedback && <p className="text-[11px] text-slate-600 line-clamp-3">{feedback.slice(0, 200)}</p>}
    </CardWrapper>
  );
}

function WebsiteAnalysisCard({ data }: { data: Record<string, unknown> }) {
  const info = data.detected_info as Record<string, unknown> | undefined;
  const logo = data.logo_url as string | undefined;
  if (!info) return null;

  return (
    <CardWrapper>
      <div className="flex items-center gap-3 mb-3">
        {logo && (
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden grid place-items-center shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-slate-700">{typeof info.brand_name === 'string' ? info.brand_name : 'Sitio analizado'}</p>
          {typeof info.industry === 'string' ? <p className="text-[10px] text-slate-400">{info.industry}</p> : null}
        </div>
      </div>
      {typeof info.business_summary === 'string' ? (
        <p className="text-[11px] text-slate-600 line-clamp-3">{info.business_summary.slice(0, 200)}</p>
      ) : null}
    </CardWrapper>
  );
}

function ReportCreatedCard({
  data,
  onOpenReport,
}: {
  data: Record<string, unknown>;
  onOpenReport?: (content: string) => void;
}) {
  const title = data.title as string | undefined;
  const type = data.type as string | undefined;
  const content = data.content as string | undefined;
  const keyInsights = data.key_insights as string[] | undefined;
  if (!title) return null;

  const typeLabels: Record<string, string> = {
    brand_strategy: 'Estrategia de marca',
    monthly_audit: 'Auditoría mensual',
    competition: 'Análisis de competencia',
    general: 'Análisis 360°',
  };

  return (
    <CardWrapper className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 grid place-items-center text-white shadow-md shrink-0">
          <Icon name="description" className="text-[20px]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-violet-800 truncate">{title}</p>
          <p className="text-[10px] text-violet-500">
            {typeLabels[type ?? ''] ?? type ?? 'Reporte'} · Generado
          </p>
        </div>
      </div>
      {keyInsights && keyInsights.length > 0 && (
        <div className="mb-3 space-y-1">
          {keyInsights.slice(0, 3).map((insight, i) => (
            <p key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
              <span className="text-violet-500 shrink-0">•</span>
              <span className="line-clamp-1">{insight}</span>
            </p>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {content && onOpenReport && (
          <button
            type="button"
            onClick={() => onOpenReport(content)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors active:scale-95 min-h-[36px]"
          >
            <Icon name="article" className="text-[16px]" />
            Abrir informe
          </button>
        )}
        <a
          href="/reports"
          className="text-[11px] font-bold text-violet-600 hover:underline"
        >
          Ver en Reportes →
        </a>
      </div>
      {content && onOpenReport && (
        <p className="mt-2 text-[10px] text-violet-400">
          Al abrir el informe podrás descargarlo como PDF o Word.
        </p>
      )}
    </CardWrapper>
  );
}

function MarketsCard({ data }: { data: Record<string, unknown> }) {
  const countries = data.countries as string[] | undefined;
  const regions = data.regions as string[] | undefined;
  if (!countries?.length) return null;

  return (
    <CardWrapper>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white">
          <Icon name="public" className="text-[16px]" />
        </div>
        <p className="text-xs font-bold text-slate-700">Mercados detectados</p>
        <p className="text-xs font-bold text-slate-700">{regions.length} mercados clave detectados</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {regions.map((r, i) => (
          <div key={i} className="p-3 rounded-xl bg-white border border-slate-100 flex flex-col h-full">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-bold text-slate-800">{r.name}</p>
              <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider', 
                r.demandLevel === 'High' ? 'bg-emerald-100 text-emerald-700' :
                r.demandLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              )}>
                {r.demandLevel} Demand
              </span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">{r.type}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {r.keyCharacteristics.slice(0, 2).map((c, j) => (
                <span key={j} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-medium truncate max-w-full">
                  {c}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 mt-auto pt-2 border-t border-slate-50 line-clamp-2">
              {r.recommendedApproach}
            </p>
          </div>
        ))}
      </div>
    </CardWrapper>
  );
}

function ImageProposalCard({ data, onQuickPrompt }: { data: Record<string, unknown>, onQuickPrompt?: (text: string) => void }) {
  const assets = data.assets as Array<{ id: string; url: string; tags: string[]; aiDescription?: string }> | undefined;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size < 3) next.add(id);
      }
      return next;
    });
  };

  const handleGenerate = (mode: 'creative' | 'referential') => {
    if (!onQuickPrompt) return;
    const modeName = mode === 'creative' ? 'Modo Creativo' : 'Apegado al Referente';
    let prompt = `Genérala en ${modeName}`;
    if (selectedIds.size > 0) {
      const idsStr = Array.from(selectedIds).join(',');
      prompt += ` [ASSETS: ${idsStr}]`;
    }
    onQuickPrompt(prompt);
  };

  return (
    <CardWrapper className="border-amber-200 from-amber-50 to-white">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 grid place-items-center text-white shadow-sm">
          <Icon name="auto_awesome" className="text-[18px]" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Propuesta de Generación Visual</p>
          <p className="text-[10px] text-slate-500">Selecciona hasta 3 referencias para usar.</p>
        </div>
      </div>
      
      {assets && assets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-5">
          {assets.map((a) => {
            const isSelected = selectedIds.has(a.id);
            const isLogo = a.tags?.includes('logo');
            return (
              <div 
                key={a.id} 
                onClick={() => toggleSelection(a.id)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-[1.25rem] border-2 transition-all duration-500 shadow-sm cursor-pointer group",
                  isSelected 
                      ? "border-[hsl(var(--color-primary))] ring-[6px] ring-[hsl(var(--color-primary)/0.1)] scale-[1.03] z-10" 
                      : "border-slate-100 bg-white hover:border-[hsl(var(--color-primary)/0.3)] hover:shadow-md"
                )}
              >
                <img src={a.url} alt="Referencia" className="w-full h-full object-cover" />
                
                {isLogo && (
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    Logo
                  </div>
                )}

                <div className={cn(
                  "absolute inset-0 flex items-center justify-center transition-all duration-300",
                  isSelected ? "bg-[hsl(var(--color-primary)/0.2)]" : "bg-black/0 group-hover:bg-black/5"
                )}>
                  {isSelected ? (
                    <div className="bg-[hsl(var(--color-primary))] text-white p-1.5 rounded-full shadow-lg animate-in zoom-in-50 duration-300">
                      <Icon name="check" className="text-[18px] font-black" />
                    </div>
                  ) : (
                    <Icon name="add_circle" className="text-[22px] text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => handleGenerate('referential')}
          disabled={selectedIds.size === 0}
          className="flex-1 px-4 py-3.5 bg-[hsl(var(--color-primary))] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale disabled:pointer-events-none"
        >
          <Icon name="auto_fix_high" className="text-[18px]" />
          Generar con Referencias
        </button>
        <button
          onClick={() => handleGenerate('creative')}
          className="flex-1 px-4 py-3.5 bg-white border-2 border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))] rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] hover:bg-[hsl(var(--color-primary)/0.05)] transition-all flex items-center justify-center gap-2"
        >
          <Icon name="auto_awesome" className="text-[18px]" />
          Exploración Creativa
        </button>
      </div>
    </CardWrapper>
  );
}
