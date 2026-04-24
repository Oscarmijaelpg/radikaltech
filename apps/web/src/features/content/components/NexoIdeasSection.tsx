import React, { useState, useMemo } from 'react';
import { Button, Icon } from '@radikal/ui';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/providers/ProjectProvider';
import { useMemories } from '@/features/memory/api/memory';
import { NexoIdeasService } from './nexo-ideas/NexoIdeasService';
import { IdeaCard } from './nexo-ideas/IdeaCard';
import { IntelligenceStatus } from './nexo-ideas/IntelligenceStatus';
import { VisualContract } from './nexo-ideas/VisualContract';

interface ContentIdea {
  title: string;
  description: string;
  platform: string;
  visual_suggestion: string;
  type: 'pilar' | 'carrusel';
  image_count: number;
  suggested_assets?: string[];
}

export const NexoIdeasSection: React.FC = () => {
  const { profile } = useAuth();
  const { activeProject } = useProject();
  const { data: memories = [], refetch: refetchMemories } = useMemories(
    activeProject?.id,
  );

  const [step, setStep] = useState<'status' | 'ideas' | 'contract'>('status');
  const [isResearching, setIsResearching] = useState(false);
  const [isIdeating, setIsIdeating] = useState(false);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtrar memorias de inteligencia
  const intelligence = useMemo(() => {
    const news = memories.find((m: any) => m.memory_category === 'industry_news');
    const competitors = memories.find((m: any) => m.memory_category === 'competitors_news');
    const brand = memories.filter((m: any) =>
      ['identity', 'branding', 'identidad', 'visual_direction', 'mi marca'].includes(
        m.memory_category?.toLowerCase() || '',
      ),
    );
    return { news, competitors, brand };
  }, [memories]);

  const handleStartResearch = async () => {
    if (!activeProject || !profile) return;
    setIsResearching(true);
    setError(null);
    try {
      await NexoIdeasService.refreshIntelligence(profile.id, activeProject.id);
      await refetchMemories();
    } catch (err: any) {
      setError(err.message || 'Error al investigar el mercado.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!intelligence.news || !intelligence.competitors) {
      setError('Nexo necesita investigar primero el mercado para generar ideas estratégicas.');
      return;
    }

    setIsIdeating(true);
    try {
      const result = await NexoIdeasService.generateIdeas(
        intelligence.news,
        intelligence.competitors,
        intelligence.brand,
      );
      setIdeas(result);
      setStep('ideas');
    } catch (err: any) {
      setError('Nexo no pudo conectar las ideas ahora. Intenta de nuevo.');
    } finally {
      setIsIdeating(false);
    }
  };

  const handleSelectIdea = (idea: ContentIdea) => {
    setSelectedIdea(idea);
    setStep('contract');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cabecera de Sección */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Icon name="psychology" className="text-2xl" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Ideas de Nexo
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Inteligencia estratégica para tu contenido
          </p>
        </div>
      </div>

      {step === 'status' && (
        <IntelligenceStatus
          hasNews={!!intelligence.news}
          hasCompetitors={!!intelligence.competitors}
          isResearching={isResearching}
          onResearch={handleStartResearch}
          onGenerateIdeas={handleGenerateIdeas}
          isLoadingIdeas={isIdeating}
        />
      )}

      {step === 'ideas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea, idx) => (
            <IdeaCard key={idx} idea={idea} onClick={() => handleSelectIdea(idea)} />
          ))}
          <button
            onClick={() => setStep('status')}
            className="flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all group bg-slate-50/50"
          >
            <Icon
              name="refresh"
              className="text-3xl mb-2 group-hover:rotate-180 transition-transform duration-500"
            />
            <span className="text-xs font-bold uppercase tracking-widest">Nuevas Ideas</span>
          </button>
        </div>
      )}

      {step === 'contract' && selectedIdea && (
        <VisualContract
          idea={selectedIdea}
          brandMemories={intelligence.brand}
          onBack={() => setStep('ideas')}
        />
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold flex items-center gap-3 animate-shake">
          <Icon name="error" />
          {error}
        </div>
      )}
    </div>
  );
};
