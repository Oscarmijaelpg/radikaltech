import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MemoryResource } from '../../../core/domain/entities';
import { format } from 'date-fns';
import { processCitations, getMarkdownComponents } from '../../utils/memoryMarkdownUtils';
import SiraProfile from '../../../media/sira_profile.webp';
import { EnrichmentDropdown } from '../ui/EnrichmentDropdown';
import { EnrichmentRenderer } from '../ui/EnrichmentRenderer';
import { useEnrichment } from '../../hooks/useEnrichment';
import { DynamicLoadingScreen } from '../ui/DynamicLoadingScreen';
import { Modal } from '../ui/Modal';

interface NewsTabProps {
  newsMemories: MemoryResource[];
  savedNewsMemories: MemoryResource[];
  newsSubTab: 'current' | 'saved';
  setNewsSubTab: (tab: 'current' | 'saved') => void;
  savedSectionIds: Set<string>;
  setSavedSectionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onOpenSira: (content: string) => void;
  onSaveMemory: (data: any) => void;
  onOpenMemory: (m: MemoryResource) => void;
  user: any;
  allMemories: MemoryResource[];
  onSearchNews: (topic?: string) => void;
  isSearching: boolean;
}

export const NewsTab: React.FC<NewsTabProps> = ({
  newsMemories,
  savedNewsMemories,
  newsSubTab,
  setNewsSubTab,
  savedSectionIds,
  setSavedSectionIds,
  onOpenSira,
  onSaveMemory,
  onOpenMemory,
  user,
  allMemories,
  onSearchNews,
  isSearching
}) => {
  const navigate = useNavigate();
  const { enrichSection, isLoading: isEnriching } = useEnrichment(user?.id || '');
  const [isRefreshModalOpen, setIsRefreshModalOpen] = React.useState(false);

  const handleSearchNews = () => {
    onSearchNews();
  };

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
      (m.tags?.includes('news') || m.tags?.includes('noticias'))
    );
  }, [allMemories]);

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
        <div className="flex items-center gap-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))]">
            <span className="material-symbols-outlined text-3xl">newspaper</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex flex-col md:flex-row md:items-center gap-4">
              Noticias y Actualizaciones
              <div className="flex bg-slate-100 p-1 rounded-xl w-max">
                <button
                  onClick={() => setNewsSubTab('current')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${newsSubTab === 'current' ? 'bg-white text-[hsl(var(--color-primary))] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Noticia actual
                </button>
                <button
                  onClick={() => setNewsSubTab('saved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${newsSubTab === 'saved' ? 'bg-white text-[hsl(var(--color-primary))] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Noticias guardadas
                </button>
              </div>
            </h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Estrategia Digital</p>
          </div>
        </div>

        <div className="relative z-10">
          <Button
            onClick={() => setIsRefreshModalOpen(true)}
            disabled={isSearching}
            variant="primary"
            className="rounded-2xl px-6 py-3 shadow-[0_15px_30px_-5px_hsl(var(--color-primary)/0.2)] hover:shadow-[0_20px_40px_-5px_hsl(var(--color-primary)/0.3)] transition-all active:scale-95 group"
            icon={<span className={`material-symbols-outlined ${isSearching ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`}>{isSearching ? 'sync' : 'refresh'}</span>}
          >
            {isSearching ? 'Buscando...' : 'Buscar nuevas noticias'}
          </Button>
        </div>
      </div>

      {newsSubTab === 'current' ? (
        (isSearching || newsMemories.length === 0) ? (
          <DynamicLoadingScreen 
            title={isSearching ? "Actualizando Inteligencia Estratégica con Radikal IA" : "Analizando Noticias con Radikal IA"} 
            subtitle={isSearching ? "Estamos rastreando la web en tiempo real para encontrar las novedades y tendencias más relevantes para tu marca." : "Radikal IA está rastreando la web en busca de las últimas novedades y tendencias relevantes para tu nicho."}
          />
        ) : (
          <div className="bg-white shadow-xl border border-slate-200 rounded-[2.5rem] p-6 md:p-10 relative flex flex-col gap-6">
            {newsMemories.map(news => (
              <div key={news.id} className="relative mb-12 last:mb-0">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-8 pb-6 border-b border-slate-100 relative z-10 w-full gap-6">
                  <h1 className="text-3xl font-black text-slate-900 leading-tight flex-1">
                    {news.title || 'Actualización de Estrategia'}
                  </h1>
                  <div className="flex flex-wrap gap-4 shrink-0">
                    <button
                      onClick={() => onOpenSira(news.content)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-[hsl(var(--color-primary))] transition-all shadow-lg hover:shadow-[hsl(var(--color-primary)/0.1)] group active:scale-95"
                    >
                      <div className="flex flex-col items-end mr-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]">Consultar Experta</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Sira</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[hsl(var(--color-primary))] bg-white shrink-0">
                        <img src={SiraProfile} alt="Sira" className="w-full h-full object-cover" />
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("¿Quieres que Nexo genere ideas de contenido basadas en esta noticia?")) {
                          navigate('/content?tab=news');
                        }
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-[hsl(var(--color-secondary))] transition-all shadow-lg hover:shadow-[hsl(var(--color-secondary)/0.1)] group active:scale-95"
                    >
                      <div className="flex flex-col items-end mr-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--color-secondary))]">Generar Ideas</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Nexo</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[hsl(var(--color-secondary))] bg-white shrink-0">
                        <img src="https://i.ibb.co/0RHH3JLc/Nexo-hablando.png" alt="Nexo" className="w-full h-full object-cover" />
                      </div>
                    </button>
                  </div>
                </div>

                {processCitations(news.content, news.id!).split(/(?=\n#{1,3}\s+)/).map((sec, idx) => {
                  const titleMatch = sec.match(/#{1,3}\s+(.*)/);
                  const secTitle = titleMatch ? titleMatch[1].trim() : (idx === 0 ? (news.title || 'Introducción') : 'Sección');
                  const sectionId = `${news.id}-sec-${idx}`;
                  const isSaved = savedSectionIds.has(sectionId);

                  return (
                    <div key={idx} className="relative group p-4 md:p-6 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className={`flex items-center justify-end gap-2 mb-4 transition-opacity z-10 ${isSaved ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                        <EnrichmentDropdown
                          isLoading={isEnriching}
                          onEnrich={(type) => enrichSection(type, news.id!, secTitle, sec.trim())}
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
                              memory_category: 'saved_news_section',
                              resource_type: 'markdown'
                            });
                          }}
                          icon={<span className="material-symbols-outlined text-sm">{isSaved ? 'bookmark_added' : 'bookmark'}</span>}
                        >
                          {isSaved ? 'Guardado' : 'Guardar'}
                        </Button>
                      </div>
                      <div className="prose prose-slate max-w-none relative z-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={getMarkdownComponents(news.id!)}>
                          {sec.trim()}
                        </ReactMarkdown>
                      </div>

                      {/* Render enrichments for this section */}
                      {enrichments.filter(e => {
                        try {
                          const data = JSON.parse(e.content);
                          return data.parentId === news.id && data.sectionTitle === secTitle;
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

            {/* Infographics Gallery */}
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
        )
      ) : (
        savedNewsMemories.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white shadow-inner">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-400 font-thin">bookmark_border</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No hay noticias guardadas</h3>
            <p className="text-slate-500 text-sm max-w-sm text-center leading-relaxed">
              Usa el botón "Guardar" en las secciones de la noticia actual para que aparezcan aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedNewsMemories.map((saved) => (
              <Card
                key={saved.id}
                onClick={() => onOpenMemory(saved)}
                className="p-6 bg-white border-[hsl(var(--color-primary)/0.2)] cursor-pointer hover:shadow-lg hover:border-[hsl(var(--color-primary))] transition-all group"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50 ">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] rounded text-[10px] font-black uppercase tracking-widest">
                      Guardada
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">{saved.created_at ? format(new Date(saved.created_at), 'dd MMM yyyy') : ''}</span>
                  </div>
                  <span className="material-symbols-outlined text-[hsl(var(--color-primary))] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-[hsl(var(--color-primary))] transition-colors">
                  {saved.title?.replace('Guardado: ', '') || 'Sección guardada'}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed italic opacity-80">
                  {saved.content ? saved.content.replace(/#/g, '').substring(0, 150) : ''}...
                </p>
              </Card>
            ))}
          </div>
        )
      )}

      <Modal isOpen={isRefreshModalOpen} onClose={() => setIsRefreshModalOpen(false)}>
        <div className="p-8 max-w-md mx-auto text-center">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
             <span className="material-symbols-outlined text-3xl">warning</span>
           </div>
           <h3 className="text-2xl font-bold text-slate-900 mb-2">¿Buscar Nuevas Noticias?</h3>
           <p className="text-slate-500 text-sm mb-8 leading-relaxed">
             Al continuar, se realizará una nueva búsqueda y <b>se perderán las noticias actuales</b> que no hayas guardado en la pestaña "Noticias guardadas". ¿Deseas continuar?
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
                 handleSearchNews();
               }}
             >
               Continuar
             </Button>
           </div>
        </div>
      </Modal>

    </div>
  );
};
