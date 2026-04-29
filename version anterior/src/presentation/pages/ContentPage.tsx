import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGeneratedImages, useDeleteChatMessage } from '../hooks/useGeneratedImages';
import { useMemories, useDeleteMemory } from '../hooks/useMemory';
import { useNavigate, Link } from 'react-router-dom';
import { ContentIdeation } from '../components/content/ContentIdeation';
import { useChat } from '../hooks/useChat';
import { useObjectives } from '../hooks/useObjectives';
import { supabase } from '../../infrastructure/supabase/client';
import { ArchiveHeader } from '../components/layout/ArchiveHeader';
import { AddKnowledgeModal } from '../components/chat/AddKnowledgeModal';
import { useState } from 'react';
import clsx from 'clsx';
import { ImageOverlay } from '../components/ui/ImageOverlay';
import { useProjectContext } from '../context/ProjectContext';

export const ContentPage: React.FC = () => {
  const { user } = useAuth();
  const { activeProject } = useProjectContext();
  const { data: images = [], isLoading } = useGeneratedImages(user?.id || '', activeProject?.id || null);
  const { data: memories = [] } = useMemories(user?.id || '', activeProject?.id || null);
  const { mutate: deleteChatMessage } = useDeleteChatMessage();
  const { mutate: deleteMemory } = useDeleteMemory();
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ id: string; url: string; title: string; content: string; type: 'chat' | 'memory' } | null>(null);
  const navigate = useNavigate();
  const { createChat } = useChat();
  const { data: objectives } = useObjectives();

  const { competitionData, brandData, newsData, competitionInfographics, newsInfographics } = useMemo(() => {
    const comp = memories.filter(m => {
      const cat = m.memory_category?.toLowerCase() || '';
      return (
        cat === 'market_analysis' ||
        cat === 'social_media_analysis' ||
        cat === 'market_analisis' ||
        cat === 'social_media_analisis' ||
        cat === 'mercado' ||
        cat === 'competencia' ||
        cat === 'social media' ||
        cat === 'saved_competition_section' ||
        cat === 'rrss' ||
        cat === 'estadisticas'
      );
    });

    const brand = memories.filter(m => {
      const cat = (m.memory_category || '').toLowerCase();

      const isNews = ['news', 'noticias', 'actualizaciones', 'saved_news_section'].includes(cat);
      const isComp = ['market_analysis', 'social_media_analysis', 'market_analisis', 'social_media_analisis', 'mercado', 'competencia', 'social media', 'saved_competition_section', 'rrss', 'estadisticas'].includes(cat);

      if (isNews || isComp) return false;

      // Filter by title (exclude Nexo results)
      if (m.title?.startsWith('Contrato Visual:')) return false;

      // BRAND CATEGORIES (Text)
      const isBrandText = ['identity', 'branding', 'identidad', 'logo', 'identidad y esencia', 'visual_direction', 'mi marca', 'identidad_marca'].includes(cat);

      // BRAND IMAGES (Exclusively from Biblioteca de Imágenes - Mi Marca)
      const isBrandImage = cat === 'analisis_imagenes';

      if (isBrandImage) {
        // Filter by domain (restricted assets)
        const RESTRICTED_DOMAINS = ['pixel.wp.com', 'gravatar.com', 'doubleclick.net', 'analytics'];
        let url = m.summary || '';
        if (!url) {
          try {
            const data = JSON.parse(m.content);
            url = data.url || data.imageUrl || data.link || m.content;
          } catch (e) {
            if (m.content?.startsWith('http')) url = m.content;
          }
        }

        if (url) {
          const lowUrl = url.toLowerCase();
          if (lowUrl.endsWith('.svg') || lowUrl.includes('image/svg')) return false;
          if (RESTRICTED_DOMAINS.some(domain => lowUrl.includes(domain))) return false;
        }
      }

      return isBrandText || isBrandImage;
    });

    const news = memories.filter(m => {
      const cat = m.memory_category?.toLowerCase() || '';
      return (
        cat === 'news' ||
        cat === 'noticias' ||
        cat === 'actualizaciones' ||
        cat === 'saved_news_section'
      );
    });

    const competitionInfographics = memories.filter(m =>
      m.memory_category === 'infografia_analisis' && m.tags?.includes('competition')
    );

    const newsInfographics = memories.filter(m =>
      m.memory_category === 'infografia_analisis' && m.tags?.includes('news')
    );

    return {
      competitionData: comp,
      brandData: brand,
      newsData: news,
      competitionInfographics,
      newsInfographics
    };
  }, [memories]);

  const allImages = useMemo(() => {
    const chatImages = images.map((img: any) => ({
      id: img.id,
      url: img.image_url,
      title: img.chat_title || 'Chat IA',
      content: img.content,
      created_at: img.created_at,
      link: `/chat/${img.chat_id}`,
      type: 'chat' as const
    }));

    const memoryImages = memories
      .filter((m: any) => {
        const cat = m.memory_category;
        const resType = m.resource_type;
        const isIdea = m.title?.startsWith('Contrato Visual:');

        // Show in bank if it's a standard AI image OR if it's an ideation result (even if tagged as analysis)
        return (cat === 'analisis_imagenes' || resType === 'analisis_imagenes' || isIdea) &&
          m.summary &&
          (isIdea || cat !== 'infografia_analisis');
      })
      .map((m: any) => ({
        id: m.id,
        url: m.summary, // We use summary as the storage for URL in Nexo generation
        title: m.title || 'Propuesta Nexo',
        content: m.content,
        created_at: m.created_at || new Date().toISOString(),
        link: null,
        type: 'memory' as const
      }));

    return [...chatImages, ...memoryImages].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [images, memories]);

  const handleDeleteImage = (img: { id: string; type: 'chat' | 'memory' }) => {
    if (img.type === 'chat') {
      deleteChatMessage({ messageId: img.id, userId: user?.id || '', projectId: activeProject?.id || null });
    } else {
      deleteMemory({ memoryId: img.id, userId: user?.id || '', projectId: activeProject?.id || null });
    }
    setSelectedImage(null);
  };

  const handleContinueToChat = async (imageUrl: string) => {
    if (!user || !selectedImage) return;

    try {
      const contentObjective = objectives?.find(obj =>
        obj.name.toLowerCase().includes('contenido') ||
        obj.name.toLowerCase().includes('nexo')
      ) || objectives?.[0];

      if (!contentObjective) return;

      if (!activeProject) {
        alert('No tienes un proyecto seleccionado. Por favor, selecciona uno en la barra lateral.');
        return;
      }

      const chat = await createChat({
        userId: user.id,
        projectId: activeProject.id,
        objectiveId: contentObjective.id,
        title: `Refinamiento: ${selectedImage.title}`
      });

      // Use content from selectedImage which contains the strategy
      let strategyText = selectedImage.content;
      try {
        const parsed = JSON.parse(selectedImage.content);
        if (parsed.strategy) strategyText = parsed.strategy;
      } catch (e) { /* already string */ }

      const strategy = strategyText.replace(/Idea de Nexo:|Prompts:/g, '').trim();

      const triggerMessage = `[REAJUSTE_SISTEMA] Hola Nexo. Quiero hacer unos ajustes quirúrgicos a esta imagen.

IDEA ORIGINAL: ${selectedImage.title}
ESTRATEGIA: ${strategy.substring(0, 400)}${strategy.length > 400 ? '...' : ''}

Por favor, analízala y dime qué cambios puntuales deseas que hagamos (fondo, iluminación, sustitución de logo por uno oficial de mi biblioteca, etc).`;

      await supabase.from('messages').insert({
        chat_id: chat.id,
        role: 'user',
        content: triggerMessage,
        image_url: imageUrl
      });

      navigate(`/chat/${chat.id}`);
    } catch (e) {
      console.error("Error transitioning to chat:", e);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white m-2 rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-1rem)]">
      <ArchiveHeader
        onAddKnowledge={() => setIsAddKnowledgeOpen(true)}
        activeTab="content"
      />

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {/* Nexo Ideation Section */}
          <ContentIdeation
            competitionData={competitionData}
            brandData={brandData}
            newsData={newsData}
            competitionInfographics={competitionInfographics}
            newsInfographics={newsInfographics}
            userId={user?.id || ''}
            activeProjectId={activeProject?.id || ''}
            useAutomated={user?.use_automated_references !== false}
            useManual={user?.use_manual_references !== false}
          />

          <div className="flex items-center gap-3 mb-8 pt-8 border-t border-slate-100 ">
            <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">folder_open</span>
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Banco de Imágenes Generadas</h2>
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <span className="material-symbols-outlined animate-spin text-[hsl(var(--color-primary))] text-4xl">progress_activity</span>
              <p className="mt-4 text-slate-500">Cargando tu galería...</p>
            </div>
          ) : allImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center space-y-4 opacity-50">
              <span className="material-symbols-outlined text-6xl">image_search</span>
              <div className="max-w-sm">
                <p className="text-xl font-bold text-slate-900 mb-2">Aún no hay imágenes</p>
                <p className="text-slate-500">Las imágenes que generes con Nexo o en el chat aparecerán aquí automáticamente.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-12">
              {allImages.map((img) => (
                <div
                  key={img.id}
                  className="group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  <div className="relative aspect-square overflow-hidden bg-black/5 rounded-t-xl">
                    <img
                      src={img.url}
                      alt={img.content}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                      <button
                        onClick={() => setSelectedImage({ id: img.id, url: img.url, title: img.title, content: img.content, type: img.type })}
                        className="px-4 py-2 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[hsl(var(--color-primary))] hover:text-white transition-all shadow-xl active:scale-90"
                      >
                        ABRIR
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-tighter line-clamp-1 mb-1">
                        {img.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                        {img.content.replace(/Idea de Nexo:|Prompts:/g, '').trim()}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(img.created_at).toLocaleDateString()}
                      </span>
                      {img.link && (
                        <Link
                          to={img.link}
                          className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))] hover:underline"
                        >
                          Ir al chat
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <AddKnowledgeModal
        isOpen={isAddKnowledgeOpen}
        onClose={() => setIsAddKnowledgeOpen(false)}
      />

      {selectedImage && (
        <ImageOverlay
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrls={(() => {
            try {
              // Try to parse as JSON first (Nexo format)
              const data = JSON.parse(selectedImage.content);
              if (data.urls && Array.isArray(data.urls)) return data.urls;
              if (data.url) return [data.url];
              return [selectedImage.url];
            } catch (e) {
              // Fallback to the url property (Chat format)
              return [selectedImage.url];
            }
          })()}
          title={selectedImage.title}
          content={selectedImage.content}
          showNexo={false}
          onDelete={() => handleDeleteImage({ id: selectedImage.id, type: selectedImage.type })}
          onContinueToChat={handleContinueToChat}
        />
      )}
    </div>
  );
};
