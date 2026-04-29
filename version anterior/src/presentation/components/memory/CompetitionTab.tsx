import React, { useState } from 'react';
import { supabase } from '../../../infrastructure/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { MemoryResource } from '../../../core/domain/entities';
import { format } from 'date-fns';
import { processCitations, getMarkdownComponents } from '../../utils/memoryMarkdownUtils';
import SiraProfile from '../../../media/sira_profile.webp';
import { CompetitionCharts } from './CompetitionCharts';
import { EnrichmentDropdown } from '../ui/EnrichmentDropdown';
import { EnrichmentRenderer } from '../ui/EnrichmentRenderer';
import { useEnrichment } from '../../hooks/useEnrichment';
import { DynamicLoadingScreen } from '../ui/DynamicLoadingScreen';
import { useCompetitionAnalysis, useRefreshMarketAnalysis } from '../../hooks/useCompetitionAnalysis';
import { Modal } from '../ui/Modal';
import { CompetitorInput, CompetitorSocialAccount } from '../../../core/application/services/CompetitionAnalysisService';
import { useProjectContext } from '../../context/ProjectContext';

interface CompetitionTabProps {
  competitionMemories: MemoryResource[];
  savedCompetitionMemories: MemoryResource[];
  estadisticasMemory: MemoryResource | null;
  compSubTab: 'current' | 'saved';
  setCompSubTab: (tab: 'current' | 'saved') => void;
  savedSectionIds: Set<string>;
  setSavedSectionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onOpenSira: (content: string) => void;
  onSaveMemory: (data: any) => void;
  onOpenMemory: (m: MemoryResource) => void;
  user: any;
  allMemories: MemoryResource[];
}

import { CompetitorModal } from './CompetitorModal';

import { SmartOptionsDropdown } from '../ui/SmartOptionsDropdown';
import { UserSocialAccountModal } from './UserSocialAccountModal';

export const CompetitionTab: React.FC<CompetitionTabProps> = ({
  competitionMemories,
  savedCompetitionMemories,
  estadisticasMemory,
  compSubTab,
  setCompSubTab,
  savedSectionIds,
  setSavedSectionIds,
  onOpenSira,
  onSaveMemory,
  onOpenMemory,
  user,
  allMemories
}) => {
  const navigate = useNavigate();
  const { updateOnboarding, user: authUser } = useAuth();
  const currentUser = authUser || user;
  const { activeProject } = useProjectContext();

  const { enrichSection, isLoading: isEnriching } = useEnrichment(currentUser?.id || '', activeProject?.id || null);
  const { mutate: runAnalysis, isPending: isAnalyzing } = useCompetitionAnalysis();
  const { mutate: refreshMarket, isPending: isRefreshing } = useRefreshMarketAnalysis();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserSocialModalOpen, setIsUserSocialModalOpen] = useState(false);
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  
  const [userTikTokUrl, setUserTikTokUrl] = useState('');
  const [isAddingTikTok, setIsAddingTikTok] = useState(false);
  const [isBackgroundAnalyzing, setIsBackgroundAnalyzing] = useState(false);

  const extractCompanyContext = () => {
    const identityMems = allMemories.filter(m => {
      const cat = String(m.memory_category || '').toLowerCase();
      return cat === 'identidad_marca' || cat === 'mi marca' || cat === 'identidad';
    });
    return identityMems.map(m => `[${m.title}]: ${m.content}`).join('\n\n');
  };

  const handleRefreshMarket = () => {
    if (!currentUser?.id) return;
    if (!activeProject?.id) {
      alert("Selecciona un proyecto activo antes de refrescar el análisis.");
      return;
    }
    refreshMarket({
      userId: currentUser.id,
      projectId: activeProject.id,
      companyContext: extractCompanyContext(),
      companyName: currentUser?.company_name || 'Mi Marca'
    });
  };

  const handleStartAnalysis = async (competitors: CompetitorInput[], mode: 'combine' | 'social_only') => {
    if (competitors.length === 0) return alert("Agrega al menos un competidor");
    if (competitors.some(c => !c.name)) return alert("Todos los competidores deben tener nombre");

    const context = extractCompanyContext();

    const brandName = currentUser?.company_name || 'Mi Marca';
    const userAccounts: CompetitorSocialAccount[] = [];
    
    // Extrayendo información de redes sociales desde additional_context
    let userSocialLinks: Record<string, string[]> = {};
    if (currentUser && currentUser.additional_context) {
      try {
        const parsedContext = JSON.parse(currentUser.additional_context);
        if (parsedContext.social_links) {
          userSocialLinks = parsedContext.social_links;
        }
      } catch (e) {
        console.warn("Failed to parse additional_context:", e);
      }
    }

    if (userSocialLinks['Instagram'] && userSocialLinks['Instagram'][0]) {
      userAccounts.push({ network: 'instagram', url: userSocialLinks['Instagram'][0] });
    }
    if (userSocialLinks['Facebook'] && userSocialLinks['Facebook'][0]) {
      userAccounts.push({ network: 'facebook', url: userSocialLinks['Facebook'][0] });
    }
    if (userSocialLinks['TikTok'] && userSocialLinks['TikTok'][0]) {
      userAccounts.push({ network: 'tiktok', url: userSocialLinks['TikTok'][0] });
    }
    if (userSocialLinks['YouTube'] && userSocialLinks['YouTube'][0]) {
      userAccounts.push({ network: 'youtube', url: userSocialLinks['YouTube'][0] });
    }
    if (userSocialLinks['Twitter/X'] && userSocialLinks['Twitter/X'][0]) {
      userAccounts.push({ network: 'x', url: userSocialLinks['Twitter/X'][0] });
    }
    if (userSocialLinks['LinkedIn'] && userSocialLinks['LinkedIn'][0]) {
      userAccounts.push({ network: 'linkedin', url: userSocialLinks['LinkedIn'][0] });
    }

    const userCompetitor: CompetitorInput = {
      name: brandName,
      accounts: userAccounts
    };

    if (!activeProject?.id) {
      alert("Selecciona un proyecto activo antes de iniciar el análisis.");
      return;
    }
    runAnalysis({
      userId: currentUser?.id || '',
      projectId: activeProject.id,
      myBrand: userCompetitor,
      competitors,
      mode,
      companyContext: context
    });
    setIsModalOpen(false);
  };

  const handleSaveAndAnalyzeUserTikTok = async () => {
    if (!userTikTokUrl || !currentUser?.id) return;
    setIsAddingTikTok(true);
    try {
      const currentContext = currentUser.additional_context ? JSON.parse(currentUser.additional_context) : {};
      const socialLinks = currentContext.social_links || {};
      socialLinks['TikTok'] = [userTikTokUrl];
      
      const updatedContext = {
        ...currentContext,
        social_links: socialLinks
      };

      await updateOnboarding({
        additional_context: JSON.stringify(updatedContext)
      });
      
      // Trigger analysis immediately for 'Mi Marca'
      const context = extractCompanyContext();
      const brandName = currentUser?.company_name || 'Mi Marca';
      const userCompetitor: CompetitorInput = {
        name: brandName,
        accounts: [{ network: 'tiktok', url: userTikTokUrl }]
      };

      // We send an empty array of competitors, but CompetitionAnalysisService handles it
      if (!activeProject?.id) {
        alert("Selecciona un proyecto activo antes de iniciar el análisis.");
        setIsAddingTikTok(false);
        return;
      }
      setIsBackgroundAnalyzing(true);
      runAnalysis({
        userId: currentUser.id,
        projectId: activeProject.id,
        myBrand: userCompetitor,
        competitors: [],
        mode: 'social_only',
        companyContext: context
      }, {
        onSettled: () => {
          setIsBackgroundAnalyzing(false);
        }
      });

      setUserTikTokUrl('');
    } catch (e) {
      console.error(e);
      alert("Error al guardar y analizar tu TikTok.");
      setIsBackgroundAnalyzing(false);
    } finally {
      setIsAddingTikTok(false);
    }
  };
 
  const hasTikTok = React.useMemo(() => {
    if (!currentUser?.additional_context) return false;
    try {
      const parsed = JSON.parse(currentUser.additional_context);
      return !!(parsed.social_links?.['TikTok']?.[0]);
    } catch {
      return false;
    }
  }, [currentUser]);

  const enrichments = React.useMemo(() => {
    return allMemories.filter(m => {
      if (m.memory_category === 'enrichment') return true;
      if (m.memory_category === 'analisis_imagenes' || m.memory_category === 'infografia_analisis') {
        try {
          const content = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
          return !!content.parentId;
        } catch {
          return false;
        }
      }
      return false;
    });
  }, [allMemories]);

  const tabInfographics = React.useMemo(() => {
    return allMemories.filter(m =>
      m.memory_category === 'infografia_analisis' &&
      (m.tags?.includes('competition') || m.tags?.includes('competencia') || m.tags?.includes('market'))
    );
  }, [allMemories]);

  return (
    <div className="space-y-8 relative min-h-screen pb-20">
      {(!hasTikTok || isBackgroundAnalyzing) && (
        <div className="bg-gradient-to-r from-[hsl(var(--color-primary)/0.05)] to-transparent p-6 rounded-[2.5rem] border border-[hsl(var(--color-primary)/0.1)] flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top duration-700">
           <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-lg">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.14-.1-.18-.08-.18.09 0 2.02-.01 4.04-.01 6.07 0 4.09-2.03 7.2-6.23 7.71-3.23.45-6.63-.78-8.12-3.79-1.53-2.93-.72-7.05 2.14-8.87 1.34-.84 2.92-1.21 4.41-1.07v4.01c-1.12-.13-2.32.13-3.17.91-.86.72-1.22 1.94-.96 3.01.27 1.32 1.4 2.29 2.74 2.45 1.15.11 2.37-.29 3.01-1.28.4-.64.51-1.43.48-2.18-.02-3.29-.01-6.57-.01-9.86 0-.3-.02-.61-.02-.91z"/></svg>
           </div>
           {!isBackgroundAnalyzing ? (
             <div className="flex-1 text-center md:text-left">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Análisis de TikTok Sugerido</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xl mt-1">Detectamos que no has añadido una cuenta de TikTok. Incluir datos de esta red permite a Kronos identificar tácticas de video corto y engagement viral en tu sector.</p>
             </div>
           ) : (
             <div className="flex-1 text-center md:text-left">
                <h4 className="text-sm font-black text-[hsl(var(--color-primary))] uppercase tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Kronos está escaneando tu TikTok
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xl mt-1">Estamos extrayendo tus métricas de engagement y analizando tu contenido en segundo plano. Los gráficos aparecerán arriba en unos instantes.</p>
             </div>
           )}
           
           <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {!isBackgroundAnalyzing ? (
                <>
                  <input 
                    className="px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.2)] outline-none transition-all min-w-[200px]"
                    placeholder="Tu URL o @usuario de TikTok"
                    value={userTikTokUrl}
                    onChange={(e) => setUserTikTokUrl(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="px-6 rounded-xl shrink-0"
                    onClick={handleSaveAndAnalyzeUserTikTok}
                    isLoading={isAddingTikTok}
                    disabled={!userTikTokUrl}
                    icon={<span className="material-symbols-outlined text-sm">bolt</span>}
                  >
                     Añadir y Analizar
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-4 px-6 py-2 bg-white/50 rounded-2xl border border-[hsl(var(--color-primary)/0.2)]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[hsl(var(--color-primary))]">progress_activity</span>
                    <span className="text-xs font-bold text-slate-600">Escaneando tu cuenta...</span>
                  </div>
                  <div className="w-px h-4 bg-slate-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))] animate-pulse">Segundo plano</span>
                </div>
              )}
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
        <div className="flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))]">
            <span className="material-symbols-outlined text-3xl">insights</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex flex-col md:flex-row md:items-center gap-4">
              Análisis de Mi Competencia
              <div className="flex bg-slate-100 p-1 rounded-xl w-max">
                <button
                  onClick={() => setCompSubTab('current')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${compSubTab === 'current' ? 'bg-white text-[hsl(var(--color-primary))] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Análisis actual
                </button>
                <button
                  onClick={() => setCompSubTab('saved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${compSubTab === 'saved' ? 'bg-white text-[hsl(var(--color-primary))] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Análisis guardado
                </button>
              </div>
            </h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Mercado y RRSS</p>
          </div>
        </div>
        
        <div className="relative z-[60]">
          <SmartOptionsDropdown 
            onRefreshHistory={() => setIsRefreshModalOpen(true)}
            onAddCompetitor={() => setIsModalOpen(true)}
            onAddUserSocialAccount={() => setIsUserSocialModalOpen(true)}
            isRefreshing={isRefreshing || isAnalyzing}
          />
        </div>
      </div>

      {((isAnalyzing && !isBackgroundAnalyzing) || isRefreshing) && (
        <div className="fixed top-0 bottom-0 right-0 left-0 lg:left-72 z-[1000] bg-white/95 backdrop-blur-2xl flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-5xl h-auto max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
            <DynamicLoadingScreen 
              title={isRefreshing ? "Kronos: Refrescando Análisis del Sector" : "Kronos: Procesando Inteligencia Competitiva"} 
              subtitle={isRefreshing ? "Buscando tendencias, modelo de negocios y nuevos competidores en tu mercado operativo y global." : "Estamos extrayendo métricas profundas de engagement y analizando las estrategias reales de tus competidores."}
            />
          </div>
        </div>
      )}

      {!(isAnalyzing || isRefreshing) && (compSubTab === 'current' ? (
        <>
          {allMemories
            .filter(m => String(m.memory_category || '').toLowerCase() === 'estadisticas')
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .map(m => {
            return (
              <CompetitionCharts 
                key={m.id} 
                data={m.content} 
                memoryId={m.id}
                savedIds={savedSectionIds}
                onSave={(chart) => {
                  const chartId = `${m.id}-${chart.id}`;
                  if (savedSectionIds.has(chartId)) return;
                  setSavedSectionIds(prev => new Set(prev).add(chartId));
                  onSaveMemory({
                    user_id: user?.id,
                    title: `Gráfico: ${chart.title}`,
                    content: JSON.stringify(chart),
                    memory_category: 'saved_competition_section',
                    resource_type: 'chart',
                    summary: `sourceId:${chartId}`
                  });
                }}
              />
            );
          })}

          {competitionMemories.length === 0 ? (
            <DynamicLoadingScreen 
              title="Analizando tu Competencia" 
              subtitle="Kronos está evaluando el mercado, identificando a tus competidores y analizando sus estrategias en redes sociales."
            />
          ) : (
            <div className="bg-white shadow-xl border border-slate-200 rounded-[2.5rem] p-6 md:p-10 relative flex flex-col gap-6">
              {competitionMemories.map((comp) => (
                <div key={comp.id} className="relative mb-12 last:mb-0">
                  <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-8 pb-6 border-b border-slate-100 relative z-10 w-full gap-6">
                    <h1 className="text-3xl font-black text-slate-900 leading-tight flex-1">
                      {comp.title || 'Análisis de Competencia'}
                    </h1>
                    <div className="flex flex-wrap gap-4 shrink-0">
                      <button
                        onClick={() => onOpenSira(comp.content)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-[hsl(var(--color-primary))] transition-all shadow-lg hover:shadow-[hsl(var(--color-primary)/0.1)] group active:scale-95 shrink-0"
                      >
                        <div className="hidden md:flex flex-col items-end mr-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]">Consultar Experta</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Sira</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[hsl(var(--color-primary))] bg-white shrink-0">
                          <img src={SiraProfile} alt="Sira" className="w-full h-full object-cover" />
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm("¿Quieres que Nexo genere ideas de contenido basadas en este análisis de competencia?")) {
                            navigate('/content?tab=competition');
                          }
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-[hsl(var(--color-secondary))] transition-all shadow-lg hover:shadow-[hsl(var(--color-secondary)/0.1)] group active:scale-95 shrink-0"
                      >
                        <div className="hidden md:flex flex-col items-end mr-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--color-secondary))]">Generar Ideas</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Nexo</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[hsl(var(--color-secondary))] bg-white shrink-0">
                          <img src="https://i.ibb.co/0RHH3JLc/Nexo-hablando.png" alt="Nexo" className="w-full h-full object-cover" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {processCitations(comp.content, comp.id!).split(/(?=\n#{1,3}\s+)/).map((sec, idx) => {
                    const titleMatch = sec.match(/#{1,3}\s+(.*)/);
                    const secTitle = titleMatch ? titleMatch[1].trim() : (idx === 0 ? comp.title || 'Introducción' : 'Sección');
                    const sectionId = `${comp.id}-sec-${idx}`;
                    const isSaved = savedSectionIds.has(sectionId);

                    return (
                      <div key={idx} className="relative group p-4 md:p-6 rounded-2xl hover:bg-slate-50 transition-colors">
                        <div className={`flex items-center justify-end gap-2 mb-4 transition-opacity z-10 ${isSaved ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                          <EnrichmentDropdown
                            isLoading={isEnriching}
                            onEnrich={(type) => enrichSection(type, comp.id!, secTitle, sec.trim())}
                          />
                          <Button
                            size="sm"
                            variant={isSaved ? "secondary" : "primary"}
                            onClick={() => {
                              if (isSaved) return;
                              setSavedSectionIds(prev => new Set(prev).add(sectionId));
                              onSaveMemory({
                                user_id: user?.id,
                                title: `Guardado: ${secTitle}`,
                                content: sec.trim(),
                                memory_category: 'saved_competition_section',
                                resource_type: 'markdown'
                              });
                            }}
                            icon={<span className="material-symbols-outlined text-sm">{isSaved ? 'bookmark_added' : 'bookmark'}</span>}
                          >
                            {isSaved ? 'Guardado' : 'Guardar'}
                          </Button>
                        </div>
                        <div className="prose prose-slate max-w-none relative z-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={getMarkdownComponents(comp.id!)}>
                          {sec.trim()}
                          </ReactMarkdown>
                        </div>

                        {enrichments.filter(e => {
                          try {
                            const data = typeof e.content === 'string' ? JSON.parse(e.content) : e.content;
                            return data.parentId === comp.id && data.sectionTitle === secTitle;
                          } catch {
                            return false;
                          }
                        }).map(e => (
                          <EnrichmentRenderer key={e.id} enrichment={e} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}

              {tabInfographics.length > 0 && (
                <div className="mt-12 pt-12 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--color-secondary)/0.1)] flex items-center justify-center text-[hsl(var(--color-secondary))]">
                      <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Infografías de Nexo</h3>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Visualización de datos y estrategia</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tabInfographics.map(img => (
                      <div
                        key={img.id}
                        onClick={() => onOpenMemory(img)}
                        className="group relative cursor-pointer rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 hover:shadow-xl transition-all duration-300"
                      >
                        <div className="aspect-[16/9] relative overflow-hidden bg-black/5">
                          <img
                            src={img.summary}
                            alt={img.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                          <div className="absolute top-3 left-3">
                            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-xl">
                              Infografía
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-white">
                          <h4 className="text-slate-900 text-sm font-bold mb-1 group-hover:text-[hsl(var(--color-secondary))] transition-colors line-clamp-1">{img.title}</h4>
                          <p className="text-slate-500 text-[10px] line-clamp-1 italic">
                            {img.content.substring(0, 50)}...
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        savedCompetitionMemories.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white shadow-inner">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-400 font-thin">bookmark_border</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No hay análisis guardados</h3>
            <p className="text-slate-500 text-sm max-w-sm text-center leading-relaxed">
              Usa el botón "Guardar" en las secciones del análisis actual para que aparezcan aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedCompetitionMemories.map((saved) => (
              <Card
                key={saved.id}
                onClick={() => onOpenMemory(saved)}
                className="p-6 bg-white border-[hsl(var(--color-primary)/0.2)] cursor-pointer hover:shadow-lg hover:border-[hsl(var(--color-primary))] transition-all group"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50 ">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] rounded text-[10px] font-black uppercase tracking-widest">
                      {saved.resource_type === 'chart' ? 'Benchmarking' : 'Guardado'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">{saved.created_at ? format(new Date(saved.created_at), 'dd MMM yyyy') : ''}</span>
                  </div>
                  <span className="material-symbols-outlined text-[hsl(var(--color-primary))] opacity-0 group-hover:opacity-100 transition-opacity">
                    {saved.resource_type === 'chart' ? 'analytics' : 'arrow_forward'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-[hsl(var(--color-primary))] transition-colors">
                  {saved.title?.replace('Guardado: ', '').replace('Gráfico: ', '') || 'Sección guardada'}
                </h3>
                {saved.resource_type === 'chart' ? (
                  <div className="flex items-center gap-3 mt-4 text-slate-400">
                    <span className="material-symbols-outlined">bar_chart</span>
                    <span className="text-[10px] uppercase font-black tracking-widest italic">Análisis visualizado</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed italic opacity-80">
                    {saved.content ? saved.content.replace(/#/g, '').substring(0, 150) : ''}...
                  </p>
                )}
              </Card>
            ))}
          </div>
        )
      ))}

      <UserSocialAccountModal 
        isOpen={isUserSocialModalOpen}
        onClose={() => setIsUserSocialModalOpen(false)}
      />

      <Modal isOpen={isRefreshModalOpen} onClose={() => setIsRefreshModalOpen(false)}>
        <div className="p-8 max-w-md mx-auto text-center">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
             <span className="material-symbols-outlined text-3xl">warning</span>
           </div>
           <h3 className="text-2xl font-bold text-slate-900 mb-2">¿Refrescar Análisis?</h3>
           <p className="text-slate-500 text-sm mb-8 leading-relaxed">
             Al continuar, se generará un nuevo análisis y <b>se perderán los gráficos y noticias actuales</b> que no hayas guardado en la pestaña "Análisis guardado". ¿Deseas refrescar?
           </p>
           <div className="flex gap-4 w-full">
             <Button variant="outline" className="flex-1" onClick={() => setIsRefreshModalOpen(false)}>
               Cancelar
             </Button>
             <Button 
               variant="primary" 
               className="flex-1 bg-red-500 border-red-500 hover:bg-red-600 hover:border-red-600 text-white" 
               onClick={() => {
                 setIsRefreshModalOpen(false);
                 handleRefreshMarket();
               }}
             >
               Continuar
             </Button>
           </div>
        </div>
      </Modal>

      <CompetitorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStart={handleStartAnalysis}
        isAnalyzing={isAnalyzing}
        user={user}
      />
    </div>
  );
};
