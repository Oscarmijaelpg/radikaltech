
import React, { useState } from 'react';
import { ArchiveHeader } from '../components/layout/ArchiveHeader';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useMemories, useDeleteMemory, useSaveMemory } from '../hooks/useMemory';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { useProjectContext } from '../context/ProjectContext';
import { useGeneratedImages } from '../hooks/useGeneratedImages';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Modal } from '../components/ui/Modal';
import { MemoryResource } from '../../core/domain/entities';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { AddKnowledgeModal } from '../components/chat/AddKnowledgeModal';
import { StructuredReport } from '../components/memory/StructuredReport';
import { SiraContextualChat } from '../components/memory/SiraContextualChat';
import SiraProfile from '../../media/sira_profile.webp';
import { CompetitionCharts } from '../components/memory/CompetitionCharts';
import { ImageOverlay } from '../components/ui/ImageOverlay';
import { NewsTab } from '../components/memory/NewsTab';
import { CompetitionTab } from '../components/memory/CompetitionTab';
import { BrandTab } from '../components/memory/BrandTab';
import { NeuronasTab } from '../components/memory/NeuronasTab';
import { processCitations, getMarkdownComponents, renderFormattedBrandText } from '../utils/memoryMarkdownUtils';
import { useNewsSearch } from '../hooks/useNews';
import { DynamicLoadingScreen } from '../components/ui/DynamicLoadingScreen';


const ContentGallery: React.FC<{ images: any[], isLoading: boolean, onOpen: (img: any) => void }> = ({ images, isLoading, onOpen }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <span className="material-symbols-outlined animate-spin text-[hsl(var(--color-primary))] text-4xl">progress_activity</span>
        <p className="mt-4 text-slate-500">Cargando tu galería...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-50">
        <span className="material-symbols-outlined text-6xl">image_search</span>
        <div className="max-w-sm">
          <p className="text-xl font-bold text-slate-900 mb-2">Aún no hay imágenes</p>
          <p className="text-slate-500">Las imágenes que generes en el chat aparecerán aquí automáticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {images.map((img) => (
        <div
          key={img.id}
          className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
          onClick={() => onOpen(img)}
        >
          <div className="relative aspect-square overflow-hidden bg-black/5">
            <img
              src={img.image_url!}
              alt={img.content}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <span className="w-full py-2 bg-white text-black text-center rounded-xl font-bold text-sm hover:bg-[hsl(var(--color-primary))] hover:text-white transition-colors">
                Ver Detalle
              </span>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1">
                {img.chat_title || 'Sin título'}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 italic">
                "{img.content.substring(0, 100)}..."
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">
                {new Date(img.created_at).toLocaleDateString()}
              </span>
              <Link
                to={`/chat/${img.chat_id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--color-primary))] hover:underline"
              >
                Ir al chat
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};




export const MemoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (
    searchParams.get('tab') === 'news' ? 'news' :
      searchParams.get('tab') === 'competition' ? 'competition' :
        searchParams.get('tab') === 'content' ? 'content' :
          searchParams.get('tab') === 'team' ? 'team' :
            searchParams.get('tab') === 'neuronas' ? 'neuronas' :
              'brand' 
  );

  // We determine if we need to poll based on the active tab and its data.
  // Polling is managed via the useMemories hook. We will define refetchInterval dynamically later.
  const [refetchInterval, setRefetchInterval] = useState<number | undefined>(undefined);
  
  const { activeProject } = useProjectContext();
  const { data: memories, isLoading } = useMemories(user?.id || '', activeProject?.id || null, refetchInterval);
  const { data: generatedImages = [], isLoading: isLoadingImages } = useGeneratedImages(user?.id || '', activeProject?.id || null);
  const { mutate: deleteMemory } = useDeleteMemory();
  const { createChat } = useChat();
  const [searchTerm, setSearchTerm] = useState('');

  const [showStructured, setShowStructured] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageOverlayOpen, setIsImageOverlayOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryResource | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<MemoryResource | null>(null);
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
  const [isSiraChatOpen, setIsSiraChatOpen] = useState(false);
  const [isSiraMinimized, setIsSiraMinimized] = useState(false);
  const [siraSpecificKnowledge, setSiraSpecificKnowledge] = useState<string | null>(null);
  const [siraContextId, setSiraContextId] = useState<string | null>(null);
  const [newsSubTab, setNewsSubTab] = useState<'current' | 'saved'>('current');
  const [compSubTab, setCompSubTab] = useState<'current' | 'saved'>('current');
  const [savedSectionIds, setSavedSectionIds] = useState<Set<string>>(new Set());
  const { mutate: saveMemory } = useSaveMemory();
  const { mutate: searchNews, isPending: isSearchingNews } = useNewsSearch();

  const handleCreateReport = async (userMessage: string) => {
    if (!user || !activeProject) {
        console.error("No hay usuario o proyecto activo", { user, activeProject });
        return;
    }
    
    try {
      // Usamos el ID de objetivo de Análisis de Competencia para informes
      const REPORT_OBJECTIVE_ID = 'ba2b8695-f155-4771-ba4b-05e3ccfb2652';
      
      const chat = await createChat({
        userId: user.id,
        projectId: activeProject.id,
        objectiveId: REPORT_OBJECTIVE_ID,
        title: userMessage.length > 30 ? userMessage.substring(0, 30) + "..." : userMessage
      });

      if (chat && chat.id) {
        // Guardamos el mensaje inicial para que AgentOrchestrator lo procese al entrar al chat
        const chatUrl = `/chat/${chat.id}?initialMessage=${encodeURIComponent(userMessage)}`;
        navigate(chatUrl);
      }
    } catch (error) {
      console.error("Error creating report chat:", error);
    }
  };

  const handleSearchNews = (specificTopic?: string) => {
    if (isSearchingNews) return;

    // Extract company context from identity memories
    const identityMems = memories?.filter(m => {
      const cat = String(m.memory_category || '').toLowerCase();
      return cat === 'identidad_marca' || cat === 'mi marca' || cat === 'identidad';
    }) || [];

    const context = identityMems.map(m => `[${m.title}]: ${m.content}`).join('\n\n');

    if (!context) {
      alert("No se encontró información de la empresa para realizar la búsqueda. Por favor, asegúrate de haber completado el onboarding.");
      return;
    }

    if (!activeProject?.id) {
      alert("Selecciona un proyecto activo antes de buscar noticias.");
      return;
    }
    searchNews({ userId: user?.id || '', projectId: activeProject.id, companyContext: context, specificTopic });
  };

  const handleOpenSira = (specificData?: string) => {
    if (specificData) {
      setSiraSpecificKnowledge(specificData);
      setSiraContextId(btoa(encodeURIComponent(String(specificData).substring(0, 50))).substring(0, 16));
    } else {
      setSiraSpecificKnowledge(null);
      setSiraContextId('general');
    }
    setIsSiraMinimized(false);
    setIsSiraChatOpen(true);
  };

  const handleOpenMemory = (memory: MemoryResource) => {
    if (memory.memory_category === 'analisis_imagenes' ||
      memory.resource_type === 'image' ||
      memory.resource_type === 'analisis_imagenes') {
      setSelectedMemory(memory);
      setIsImageOverlayOpen(true);
      return;
    }

    if (memory.resource_type === 'link') {
      const content = memory.content.trim();
      if (content.startsWith('http')) {
        window.open(content, '_blank');
      } else {
        setSelectedMemory(memory);
        setIsModalOpen(true);
      }
    } else if (memory.resource_type === 'document' && memory.summary?.startsWith('http')) {
       // Allow opening directly if it's a valid link
       window.open(memory.summary, '_blank');
    } else {
      setSelectedMemory(memory);
      setIsModalOpen(true);
    }
  };

  const newsMemories = React.useMemo(() => {
    if (!memories) return [];
    return memories.filter(m => (
      m.memory_category === 'news' ||
      String(m.memory_category || '').toLowerCase() === 'noticias' ||
      String(m.memory_category || '').toLowerCase() === 'actualizaciones'
    ));
  }, [memories]);

  const savedNewsMemories = React.useMemo(() => {
    if (!memories) return [];
    return memories.filter(m => m.memory_category === 'saved_news_section');
  }, [memories]);

  const competitionMemories = React.useMemo(() => {
    if (!memories) return [];
    const filtered = memories.filter(m => {
      const cat = String(m.memory_category || '').toLowerCase();
      return (
        cat === 'market_analysis' ||
        cat === 'social_media_analysis' ||
        cat === 'market_analisis' ||
        cat === 'social_media_analisis' ||
        cat === 'mercado' ||
        cat === 'competencia' ||
        cat === 'social media'
      );
    });

    const seenIds = new Set();
    const unique = filtered.filter(m => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });

    // Sort: Market/Competition Analysis first, Social Media second
    return [...unique].sort((a, b) => {
      const catA = String(a.memory_category || '').toLowerCase();
      const catB = String(b.memory_category || '').toLowerCase();

      const isMarketA = catA.includes('market') || catA.includes('mercado') || catA.includes('competencia');
      const isMarketB = catB.includes('market') || catB.includes('mercado') || catB.includes('competencia');

      if (isMarketA && !isMarketB) return -1;
      if (!isMarketA && isMarketB) return 1;
      return 0;
    });
  }, [memories]);

  // Dedicated context pool for Sira (includes raw metrics)
  const siraIntelligenceMemories = React.useMemo(() => {
    if (!memories) return [];
    return memories.filter(m => {
      const cat = String(m.memory_category || '').toLowerCase();
      return (
        cat === 'social_media_data' ||
        cat === 'estadisticas' ||
        cat === 'market_analysis' ||
        cat === 'social_media_analysis' ||
        cat === 'competencia' ||
        cat === 'mercado' ||
        cat === 'news' ||
        cat === 'noticias'
      );
    });
  }, [memories]);

  const savedCompetitionMemories = React.useMemo(() => {
    if (!memories) return [];
    return memories.filter(m => m.memory_category === 'saved_competition_section');
  }, [memories]);

  const estadisticasMemory = React.useMemo(() => {
    if (!memories) return null;
    return memories.find(m => String(m.memory_category || '').toLowerCase() === 'estadisticas');
  }, [memories]);

  const identityMemories = React.useMemo(() => {
    if (!memories) return [];
    return memories.filter(m => {
      const cat = String(m.memory_category || '').toLowerCase();
      return cat === 'identidad_marca' || cat === 'mi marca' || cat === 'identidad' || cat === 'logo';
    });
  }, [memories]);

  const expandedMemories = React.useMemo(() => {
    if (!memories) return [];
    const result: (MemoryResource & { subTitle?: string, isSubSection?: boolean, logo_url?: string })[] = [];
    const logoUrl = memories.find(m => String(m.memory_category || '').toLowerCase() === 'logo')?.content;

    memories.forEach(m => {
      const cat = String(m.memory_category || '').toLowerCase();
      if (cat === 'logo') return;
      const isNewsItem = cat === 'news' || cat === 'noticias' || cat === 'actualizaciones' || cat === 'saved_news_section';
      const isCompItem = cat === 'market_analysis' || cat === 'social_media_analysis' || cat === 'market_analisis' || cat === 'social_media_analisis' || cat === 'mercado' || cat === 'competencia' || cat === 'social media' || cat === 'saved_competition_section' || cat === 'rrss' || cat === 'estadisticas';

      if (isNewsItem || isCompItem) return;

      if (m.memory_category === 'analisis_imagenes') {
        try {
          const imageData = JSON.parse(m.content);
          if (imageData?.analysis?.includes('Análisis no encontrado')) return;
        } catch (e) {
          if (m.content.includes('Análisis no encontrado')) return;
        }
      }

      const isIdentity = m.memory_category === 'identidad_marca' ||
        String(m.memory_category || '').toLowerCase() === 'mi marca' ||
        String(m.memory_category || '').toLowerCase() === 'identidad';

      if (isIdentity) {
        try {
          const identity = JSON.parse(m.content);
          const data = Array.isArray(identity) ? identity[0] : identity;

          const sections: Record<string, string> = {
            'Identidad y Esencia': data.identidad_esencia,
            'Portafolio de Productos': data.portafolio_productos,
            'Ventaja Competitiva': data.ventaja_competitiva,
            'Tono de Comunicación': data.tono_comunicacion,
            'Sistema Cromático': data.sistema_cromatico,
            'Dirección Visual': data.direccion_visual_imagenes,
            'Ubicaciones': data.presence_ubicaciones || data.presencia_ubicaciones,
            'Audiencia': data.perfil_audiencia,
            'Canales de Contacto': data.canales_contacto,
            'Oportunidades': data.oportunidades_mejora
          };

          Object.entries(sections).forEach(([title, content]) => {
            if (content) {
              result.push({
                ...m,
                id: `${m.id}-${title}`,
                subTitle: title,
                content: content,
                isSubSection: true,
                logo_url: title === 'Identidad y Esencia' ? (logoUrl || data.logo) : undefined
              });
            }
          });
        } catch (e) {
          result.push(m);
        }
      } else {
        result.push(m);
      }
    });

    return result;
  }, [memories]);

  const filteredMemories = React.useMemo(() => {
    const baseFiltered = expandedMemories.filter(m => {
      const titleMatch = String(m.subTitle || m.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const contentMatch = String(m.content || '').toLowerCase().includes(searchTerm.toLowerCase());
      const isLibertarioSpace = String(m.subTitle || m.title || '').includes('Dirección creativa imagen Libertario');
      return !isLibertarioSpace && (titleMatch || contentMatch);
    });

    const seenTitles = new Set<string>();
    const deduplicated: typeof expandedMemories = [];
    baseFiltered.forEach(m => {
      const title = m.subTitle || m.title || 'Untitled';
      const isImageAnalysis = m.memory_category === 'analisis_imagenes' || m.resource_type === 'analisis_imagenes' || m.resource_type === 'image';
      if (isImageAnalysis) {
        deduplicated.push(m);
      } else if (!seenTitles.has(title)) {
        seenTitles.add(title);
        deduplicated.push(m);
      }
    });
    return deduplicated;
  }, [expandedMemories, searchTerm]);

  React.useEffect(() => {
    if (memories) {
      const ids = new Set<string>();
      memories.forEach(m => {
        if (m.memory_category === 'saved_competition_section' || m.memory_category === 'saved_news_section') {
          // If we stored the sourceId in summary
          if (m.summary && m.summary.includes('sourceId:')) {
            ids.add(m.summary.replace('sourceId:', ''));
          }
        }
      });
      if (ids.size > 0) setSavedSectionIds(ids);
    }

    let shouldPoll = false;
    if (isLoading) {
      // Still loading, keep standard query behavior
      shouldPoll = false;
    } else {
      if (activeTab === 'brand') shouldPoll = true;
      if (activeTab === 'competition') shouldPoll = true;
      if (activeTab === 'news' ) shouldPoll = true;
    }
    
    if (shouldPoll) {
      setRefetchInterval(5000); // poll every 5 seconds
    } else {
      setRefetchInterval(undefined);
    }
  }, [activeTab, identityMemories.length, competitionMemories.length, newsMemories.length, isLoading]);


  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
      <ArchiveHeader
        onAddKnowledge={() => setIsAddKnowledgeOpen(true)}
      />

      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 w-full animate-in fade-in duration-700">
        {activeTab === 'news' ? (
          <NewsTab
            newsMemories={newsMemories}
            savedNewsMemories={savedNewsMemories}
            newsSubTab={newsSubTab}
            setNewsSubTab={setNewsSubTab}
            savedSectionIds={savedSectionIds}
            setSavedSectionIds={setSavedSectionIds}
            onOpenSira={handleOpenSira}
            onSaveMemory={saveMemory}
            onOpenMemory={handleOpenMemory}
            user={user}
            allMemories={memories || []}
            onSearchNews={handleSearchNews}
            isSearching={isSearchingNews}
          />
        ) : activeTab === 'competition' ? (
          <CompetitionTab
            competitionMemories={competitionMemories}
            savedCompetitionMemories={savedCompetitionMemories}
            estadisticasMemory={estadisticasMemory}
            compSubTab={compSubTab}
            setCompSubTab={setCompSubTab}
            savedSectionIds={savedSectionIds}
            setSavedSectionIds={setSavedSectionIds}
            onOpenSira={handleOpenSira}
            onSaveMemory={saveMemory}
            onOpenMemory={handleOpenMemory}
            user={user}
            allMemories={memories || []}
          />
        ) : activeTab === 'content' ? (
          <ContentGallery
            images={generatedImages}
            isLoading={isLoadingImages}
            onOpen={(img) => handleOpenMemory({
              id: img.id,
              user_id: user?.id || '',
              title: img.chat_title || 'Imagen Generada',
              content: img.content,
              resource_type: 'image',
              memory_category: 'analisis_imagenes',
              summary: img.image_url
            } as any)}
          />
        ) : (
          <>

            {/* Search */}
            <div className="relative max-w-2xl group mx-auto w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[hsl(var(--color-primary))] transition-colors">search</span>
              <input
                type="text"
                placeholder="Buscar en tu ecosistema de marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[hsl(var(--color-primary))] transition-all outline-none shadow-sm"
              />
            </div>

            {/* Grid */}
            {isLoading && !filteredMemories?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse"></div>
                ))}
              </div>
            ) : filteredMemories && filteredMemories.length > 0 ? (
              <div className="space-y-12">
                {activeTab === 'brand' && (
                  <BrandTab filteredMemories={filteredMemories} onOpenMemory={handleOpenMemory} allMemories={memories || []} />
                )}

                {activeTab === 'neuronas' && (
                  <NeuronasTab filteredMemories={filteredMemories} onOpenMemory={handleOpenMemory} onDeleteMemory={setMemoryToDelete} />
                )}
              </div>
            ) : (
              <div className="space-y-12">
                {activeTab === 'brand' && (
                  <BrandTab filteredMemories={filteredMemories} onOpenMemory={handleOpenMemory} allMemories={memories || []} />
                )}
                {activeTab === 'neuronas' && (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                    <span className="material-symbols-outlined text-6xl mb-4">folder_open</span>
                    <p className="text-xl font-bold text-slate-900">No hay archivos</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={(selectedMemory as any)?.subTitle || selectedMemory?.title || 'Detalle'}
        maxWidth="full"
      >
        <div className="space-y-6 p-2">
          <div className="flex items-center justify-between gap-4 mb-8 pt-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {selectedMemory?.memory_category || selectedMemory?.resource_type}
              </span>
              <span className="text-[10px] text-slate-400">
                {selectedMemory?.created_at ? format(new Date(selectedMemory.created_at), 'PPP', { locale: es }) : ''}
              </span>
            </div>

            {selectedMemory && (
              selectedMemory.memory_category === 'news' ||
              /noticias|actualizaciones/i.test(selectedMemory.memory_category || '') ||
              selectedMemory.memory_category === 'competition' ||
              /market|social|mercado|competencia|rrss/i.test(selectedMemory.memory_category || '')
            ) && (
                <button
                  onClick={() => handleOpenSira(selectedMemory.content)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-[hsl(var(--color-primary))] transition-all shadow-lg hover:shadow-[hsl(var(--color-primary)/0.1)] group active:scale-95"
                >
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]">Consultar Experta</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Opinión de Sira</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[hsl(var(--color-primary))] bg-white shrink-0">
                    <img src={SiraProfile} alt="Sira" className="w-full h-full object-cover" />
                  </div>
                </button>
              )}
          </div>

          <div className="prose prose-slate max-w-none">
            {selectedMemory?.memory_category === 'analisis_imagenes' || selectedMemory?.resource_type === 'image' ? (
              <div className="space-y-6">
                {(() => {
                  let imageData = null;
                  try {
                    imageData = JSON.parse(selectedMemory.content);
                  } catch (e) {
                    if (selectedMemory.content.startsWith('http')) imageData = { url: selectedMemory.content };
                  }
                  return (
                    <>
                      {imageData?.url && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-slate-100 ">
                          <img src={imageData.url} alt="Analisis" className="w-full h-auto max-h-[500px] object-contain mx-auto" />
                        </div>
                      )}
                      <div className="prose prose-slate max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={getMarkdownComponents(selectedMemory.id!)}
                        >
                          {processCitations(imageData?.analysis || selectedMemory.content, selectedMemory.id!)}
                        </ReactMarkdown>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : selectedMemory?.resource_type === 'chart' ? (
              <div className="bg-white p-4 rounded-xl">
                 <CompetitionCharts 
                  data={selectedMemory.content} 
                  memoryId={selectedMemory.id}
                  hideHeader={true}
                />
              </div>
            ) : selectedMemory?.resource_type === 'markdown' || selectedMemory?.memory_category === 'news' || selectedMemory?.memory_category === 'competition' ? (
              <div className="bg-white shadow-xl border border-slate-200 rounded-lg p-8 md:p-12 min-h-[400px]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={getMarkdownComponents(selectedMemory.id!)}
                >
                  {processCitations(selectedMemory.content, selectedMemory.id)}
                </ReactMarkdown>
              </div>
            ) : selectedMemory?.resource_type === 'document' ? (
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-[hsl(var(--color-primary))]">
                      {selectedMemory.title.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedMemory.title}</h3>
                    <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mt-1">Archivo de Memoria</p>
                  </div>
                  
                  {selectedMemory.summary?.startsWith('http') && (
                    <Button 
                      onClick={() => window.open(selectedMemory.summary, '_blank')}
                      className="mt-2 rounded-xl h-12 px-8 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">visibility</span>
                      Visualizar Documento Completo
                    </Button>
                  )}
                </div>

                <div className="prose prose-slate max-w-none bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                    <span className="material-symbols-outlined text-primary">text_snippet</span>
                    Contenido Extraído para IA
                  </h4>
                  <div className="text-slate-600 leading-relaxed whitespace-pre-wrap font-serif text-sm">
                    {selectedMemory.content.replace(/^DOCUMENTO PDF:.*CONTENIDO EXTRAÍDO:/s, '').trim() || 'No hay vista previa disponible.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-600 leading-relaxed">
                {renderFormattedBrandText(selectedMemory?.content)}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <AddKnowledgeModal
        isOpen={isAddKnowledgeOpen}
        onClose={() => setIsAddKnowledgeOpen(false)}
      />

      {/* Floating Sira Button (The launcher bubble) */}
      {
        activeTab !== 'brand' && activeTab !== 'content' && activeTab !== 'neuronas' && (!isSiraChatOpen || isSiraMinimized) && (
          <div className="fixed bottom-10 right-10 z-[60] group">
            {/* Pulsing Aura */}
            <div className="absolute inset-0 bg-[hsl(var(--color-primary))] rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>

            {/* Label with Glassmorphism */}
            <div className="absolute right-full mr-6 top-1/2 -translate-y-1/2 px-6 py-3 bg-white/80 backdrop-blur-xl text-slate-900 text-xs font-black uppercase tracking-widest rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] opacity-0 group-hover:opacity-100 transition-all transform translate-x-10 group-hover:translate-x-0 pointer-events-none whitespace-nowrap border border-white/20 ">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-sm text-[hsl(var(--color-primary))] animate-bounce">chat_bubble_outline</span>
                Sira: Protocolo de Inteligencia
              </div>
            </div>

            <button
              onClick={() => {
                if (!isSiraChatOpen) handleOpenSira();
                else setIsSiraMinimized(false);
              }}
              className="w-20 h-20 rounded-[2.5rem] bg-white border-2 border-[hsl(var(--color-primary))] shadow-[0_25px_60px_-15px_rgba(var(--color-primary-rgb),0.3)] flex items-center justify-center overflow-hidden hover:scale-110 active:scale-90 transition-all relative z-10"
            >
              <img src={SiraProfile} alt="Sira" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--color-primary)/0.2)] to-transparent opacity-60 group-hover:opacity-0 transition-opacity"></div>
            </button>
          </div>
        )
      }

      <SiraContextualChat
        isOpen={isSiraChatOpen}
        isMinimized={isSiraMinimized}
        onClose={() => {
          setIsSiraChatOpen(false);
          setIsSiraMinimized(false);
          setSiraSpecificKnowledge(null);
          setSiraContextId(null);
        }}
        onMinimize={() => setIsSiraMinimized(true)}
        onRestore={() => setIsSiraMinimized(false)}
        contextType={activeTab === 'news' ? 'news' : 'competition'}
        contextId={siraContextId || 'general'}
        onUpdateNews={handleSearchNews}
        onCreateReport={handleCreateReport}
        contextData={
          (() => {
            const identityContext = identityMemories.map(m => `[IDENTIDAD - ${m.title}]: ${m.content}`).join('\n');
            const mainContext = activeTab === 'news'
              ? newsMemories.map(m => `[RECURSO NOTICIA]: ${m.content}`).join('\n\n')
              : siraIntelligenceMemories
                  .sort((a, b) => {
                    const catA = String(a.memory_category || '').toLowerCase();
                    const catB = String(b.memory_category || '').toLowerCase();
                    const priority = (c: string) => (c === 'social_media_data' || c === 'estadisticas') ? 0 : 1;
                    return priority(catA) - priority(catB);
                  })
                  .map(m => {
                    const cat = String(m.memory_category || '').toLowerCase();
                    const title = m.title || 'Dato';
                    const prefix = cat === 'social_media_data' ? '[DATO MÉTRICO]' : 
                                  cat === 'estadisticas' ? '[JSON ESTADÍSTICO]' : '[INFORME ESTRATÉGICO]';
                    // Limit individual content to avoid one large resource taking all context
                    const content = m.content.length > 3000 ? m.content.substring(0, 3000) + "..." : m.content;
                    return `${prefix} - ${title}: ${content}`;
                  }).join('\n\n');

            const specificFocus = siraSpecificKnowledge ? `\n\n[ENFOQUE ESPECÍFICO - PREGUNTA SOBRE ESTO PRIORITARIAMENTE]:\n${siraSpecificKnowledge}` : '';

            return `INFO DE LA EMPRESA (CONTEXTO CLAVE):\n${identityContext}\n\nCONTENIDO ANALIZADO (MEMORIA COMPARTIDA):\n${mainContext}${specificFocus}`;
          })()
        }
      />

      {isImageOverlayOpen && selectedMemory && (
        <ImageOverlay
          isOpen={isImageOverlayOpen}
          onClose={() => setIsImageOverlayOpen(false)}
          imageUrls={(() => {
            try {
              const data = JSON.parse(selectedMemory.content);
              if (data.urls && Array.isArray(data.urls)) return data.urls;
              return [data.url || selectedMemory.summary || selectedMemory.content];
            } catch (e) {
              return [selectedMemory.summary || selectedMemory.content];
            }
          })()}
          title={(selectedMemory as any).subTitle || selectedMemory.title || 'Detalle de Imagen'}
          content={(() => {
            try {
              const data = JSON.parse(selectedMemory.content);
              return data.strategy || data.analysis || selectedMemory.content;
            } catch (e) {
              return selectedMemory.content;
            }
          })()}
          showNexo={true}
          onDelete={() => {
            setMemoryToDelete(selectedMemory);
            setIsImageOverlayOpen(false);
          }}
        />
      )}

      <Modal
        isOpen={!!memoryToDelete}
        onClose={() => setMemoryToDelete(null)}
        title="Eliminar archivo"
        maxWidth="md"
      >
        <div className="p-2 space-y-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
              <span className="material-symbols-outlined text-3xl">delete</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">¿Estás seguro?</h3>
            <p className="text-slate-600 text-sm">
              Esta acción no se puede deshacer. Se eliminará permanentemente: <br />
              <span className="font-semibold text-slate-900 mt-2 block">"{memoryToDelete?.title || (memoryToDelete as any)?.subTitle || 'este archivo'}"</span>
            </p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setMemoryToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600"
              onClick={() => {
                if (memoryToDelete?.id) {
                  deleteMemory({ memoryId: memoryToDelete.id, userId: user?.id || '' });
                  setMemoryToDelete(null);
                }
              }}
            >
              Sí, eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div >
  );
};
