import React, { useState } from 'react';
import { Button, Icon } from '@radikal/ui';
import { api } from '@/lib/api';

interface VisualContractProps {
  idea: {
    title: string;
    description: string;
    visual_suggestion: string;
  };
  brandMemories: any[];
  onBack: () => void;
}

export const VisualContract: React.FC<VisualContractProps> = ({
  idea,
  brandMemories,
  onBack,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'referential' | 'creative'>('creative');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Buscamos el logo en las memorias de marca
      const logoMemory = brandMemories.find(
        (m) =>
          m.memory_category?.toLowerCase() === 'logo' ||
          m.title?.toLowerCase().includes('logo'),
      );

      let logoUrl = '';
      if (logoMemory) {
        try {
          const content = JSON.parse(logoMemory.content);
          logoUrl = content.url || logoMemory.summary;
        } catch (e) {
          logoUrl = logoMemory.summary || '';
        }
      }

      const prompt = `
                ### ESTRATEGIA DE CONTENIDO ###
                Título: ${idea.title}
                Concepto: ${idea.description}
                
                ### INSTRUCCIONES VISUALES ###
                ${idea.visual_suggestion}
                
                ### BRANDING ###
                Integra la identidad de marca. ${
                  logoUrl
                    ? `Usa el logo oficial (${logoUrl}) de forma elegante en la composición.`
                    : 'Mantén un estilo profesional y coherente.'
                }
                Estilo: Premium, alta calidad, marketing digital.
            `;

      // Usamos el endpoint de generación de imagen del api principal
      const res = await api.post<{ data: { url: string } }>('/ai-services/generate-image', {
        prompt,
        size: '1024x1024',
        style: 'vivid',
        mode, // Pasamos el modo seleccionado
      });

      setGeneratedUrl(res.data.url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl animate-in zoom-in duration-500">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold uppercase text-[10px] tracking-widest"
      >
        <Icon name="arrow_back" className="text-sm" />
        Volver a Ideas
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h3 className="text-3xl font-black text-slate-900 mb-6 uppercase tracking-tighter">
            Contrato Visual
          </h3>
          <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <div>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 block">
                Estrategia Detallada
              </span>
              <p className="text-slate-700 text-sm leading-relaxed">{idea.description}</p>
            </div>
            <div className="pt-6 border-t border-slate-200">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 block">
                Sugerencia Visual
              </span>
              <p className="text-slate-700 text-sm leading-relaxed italic">
                {idea.visual_suggestion}
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            <div className="pt-6 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">
                Modo de Generación
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('referential')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    mode === 'referential'
                      ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    name="biotech"
                    className={`text-xl ${mode === 'referential' ? 'text-indigo-600' : 'text-slate-400'}`}
                  />
                  <div className="text-center">
                    <p className={`text-[11px] font-bold ${mode === 'referential' ? 'text-indigo-900' : 'text-slate-700'}`}>Referencial</p>
                    <p className="text-[9px] text-slate-500">Fidelidad 100%</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode('creative')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    mode === 'creative'
                      ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    name="auto_awesome"
                    className={`text-xl ${mode === 'creative' ? 'text-indigo-600' : 'text-slate-400'}`}
                  />
                  <div className="text-center">
                    <p className={`text-[11px] font-bold ${mode === 'creative' ? 'text-indigo-900' : 'text-slate-700'}`}>Creativo</p>
                    <p className="text-[9px] text-slate-500">ADN de Marca</p>
                  </div>
                </button>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-indigo-600 text-white px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-100 w-full h-auto"
            >
              {isGenerating ? 'Generando Pieza...' : 'Generar con IA'}
            </Button>
          </div>
        </div>

        <div className="aspect-square bg-slate-100 rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center relative group">
          {generatedUrl ? (
            <img src={generatedUrl} className="w-full h-full object-cover" alt="Generated" />
          ) : (
            <div className="text-center p-12">
              <Icon
                name="image"
                className="text-6xl text-slate-300 mb-4 animate-pulse block mx-auto"
              />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose">
                {isGenerating
                  ? 'Nexo está pintando tu estrategia...'
                  : 'Haz click en Generar para materializar esta idea'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
