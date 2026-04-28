import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Icon,
  Spinner,
  Badge,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { getCharacter } from '@/shared/characters';
import { useToast } from '@/shared/ui/Toaster';
import { IdeaCard } from './nexo-ideas/IdeaCard';
import { VisualContract } from './nexo-ideas/VisualContract';
import {
  useGenerateIdeas,
  type ContentIdea,
} from './nexo-ideas/api';
import { useReports, useGenerateUnified } from '@/features/reports/api/reports';
import { useAssets, type GenerateImageResult } from '../api/content';
import { useMemories } from '@/features/memory/api/memory/memories';

export function NexoIdeasSection() {
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<'start' | 'ideas'>('start');
  const [phase, setPhase] = useState<'idle' | 'generating_report' | 'generating_ideas'>('idle');
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [selected, setSelected] = useState<ContentIdea | null>(null);
  const [resultModal, setResultModal] = useState<GenerateImageResult | null>(null);

  const { data: reports, isLoading: isLoadingReports } = useReports(activeProject?.id);
  const { data: assets } = useAssets(activeProject?.id);
  const { data: memories } = useMemories(activeProject?.id, 'ideation');
  
  const generateIdeas = useGenerateIdeas();
  const generateReport = useGenerateUnified();

  const nexoChar = getCharacter('nexo');

  // Sync step with ideas state
  useEffect(() => {
    if (ideas.length > 0) {
      setStep('ideas');
    }
  }, [ideas]);

  // Cargar ideas persistentes desde la base de datos (Memoria) - Solo al inicio
  useEffect(() => {
    if (memories && memories.length > 0 && ideas.length === 0 && activeProject) {
      const latest = memories.find(m => m.key === 'latest_ideas');
      if (latest) {
        try {
          const parsed = JSON.parse(latest.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIdeas(parsed);
          }
        } catch (e) {
          console.error('Failed to parse persistent ideas', e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memories?.length, activeProject?.id]);

  const handleStart = async () => {
    if (!activeProject) return;

    // Buscamos si existe al menos un reporte general/integral reciente
    const hasIntegralReport = reports?.some(r => r.reportType === 'general' || r.reportType === 'strategy');

    if (!hasIntegralReport) {
      // Si no hay reportes de peso, generamos uno integral internamente
      setPhase('generating_report');
      try {
        await generateReport.mutateAsync({ project_id: activeProject.id });
        // Reporte listo, ahora sí ideamos
        await triggerIdeation();
      } catch (err) {
        setPhase('idle');
        toast({ 
          title: 'Contexto no disponible', 
          description: 'No pudimos generar el reporte integral. Verifica tu conexión.',
          variant: 'error' 
        });
      }
    } else {
      // Ya hay reportes previos, vamos directo a la creatividad
      await triggerIdeation();
    }
  };

  const triggerIdeation = async () => {
    if (!activeProject) return;
    setPhase('generating_ideas');
    try {
      const res = await generateIdeas.mutateAsync({ 
        projectId: activeProject.id, 
        angle: 'auto', 
        count: 5 
      });
      setIdeas(res.ideas);
      setStep('ideas');
      setPhase('idle');
    } catch (err) {
      setPhase('idle');
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast({ title: 'Nexo encontró un obstáculo', description: msg, variant: 'error' });
    }
  };

  if (!activeProject) {
    return (
      <Card className="p-12 text-center">
        <CharacterEmpty
          character="nexo"
          title="Necesito un proyecto"
          message="Selecciona un proyecto activo para que pueda acceder a tus reportes y memorias de marca."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      {step === 'start' && (
        <Card className="p-16 text-center bg-white border-slate-100 shadow-xl rounded-[4rem] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600"></div>
          
          <div className="max-w-2xl mx-auto space-y-10">
            <div className="relative inline-block">
                <div className="w-32 h-32 mx-auto rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl relative z-10">
                    <img src={nexoChar.image} alt="Nexo" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -inset-4 bg-amber-100 rounded-[4rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
            </div>

            <div className="space-y-4">
              <h2 className="text-5xl font-display font-black text-slate-900 tracking-tight">
                {phase === 'generating_report' ? 'Preparando terreno...' : '¿Qué creamos hoy?'}
              </h2>
              <p className="text-xl text-slate-500 font-medium leading-relaxed">
                {phase === 'generating_report' 
                  ? 'Estoy analizando tu marca 360° para que mis ideas tengan sustento real.' 
                  : 'Transformo tus reportes integrales en estrategias de contenido de alto impacto.'}
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <Button
                size="lg"
                onClick={handleStart}
                disabled={phase !== 'idle'}
                className="h-20 px-12 rounded-3xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 text-lg font-black uppercase tracking-widest group"
              >
                {phase !== 'idle' ? (
                  <>
                    <Spinner className="mr-4 h-6 w-6" />
                    {phase === 'generating_report' ? 'Analizando Marca...' : 'Destilando Ideas...'}
                  </>
                ) : (
                  <>
                    Ideas desde reporte
                    <Icon name="arrow_forward" className="ml-4 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </Button>
              
              <div className="flex items-center gap-3 text-slate-400">
                <Icon name="verified" className="text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Basado en tu último reporte integral</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {step === 'ideas' && ideas.length > 0 && (
        <div className="space-y-16">
          <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 bg-slate-50/40 p-10 md:p-16 rounded-[5rem] border border-white shadow-inner">
              <div className="flex flex-col md:flex-row items-center justify-between mb-20 gap-10">
                  <div className="flex items-center gap-8 text-left">
                      <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl -rotate-6 group hover:rotate-0 transition-transform duration-500">
                          <img src={nexoChar.image} alt="Nexo" className="w-full h-full object-cover" />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Inteligencia Activa</span>
                          </div>
                          <h3 className="font-display font-black text-slate-900 text-5xl tracking-tighter">Propuestas de Nexo</h3>
                          <p className="text-lg text-slate-500 font-medium mt-1">Contenido destilado de tu último análisis integral</p>
                      </div>
                  </div>
                  
                  <button
                      onClick={() => {
                        setStep('start');
                        setIdeas([]);
                        setPhase('idle');
                      }}
                      className="px-8 py-5 rounded-3xl bg-white border border-slate-200 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:shadow-xl transition-all flex items-center gap-3 active:scale-95"
                  >
                      <Icon name="refresh" className="text-lg" />
                      NUEVA SESIÓN
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {ideas.map((idea, i) => (
                  <div key={`${idea.title}-${i}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 150}ms` }}>
                    <IdeaCard
                      idea={idea}
                      onOpen={() => setSelected(idea)}
                      onGenerateImage={() => setSelected(idea)}
                    />
                  </div>
                ))}
              </div>
          </div>

          {/* Galería de Generados Recientes */}
          <section className="animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
             <div className="flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-slate-200"></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tus creaciones recientes</h4>
                <div className="h-px flex-1 bg-slate-200"></div>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {assets?.filter(a => a.tags.includes('generated')).slice(0, 12).map((asset) => (
                  <div key={asset.id} className="group relative aspect-square rounded-3xl overflow-hidden border-2 border-white shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                    <img src={asset.asset_url} className="w-full h-full object-cover" alt="Generated" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Button size="sm" variant="secondary" className="scale-75" onClick={() => setResultModal({ url: asset.asset_url })}>
                          Ver
                       </Button>
                    </div>
                  </div>
                ))}
                {(!assets || assets.filter(a => a.tags.includes('generated')).length === 0) && (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs italic">
                    Las imágenes que generes con Nexo aparecerán aquí.
                  </div>
                )}
             </div>
          </section>
        </div>
      )}

      <VisualContract
        idea={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onSuccess={(res) => {
          setSelected(null);
          setResultModal(res);
          if (selected) {
            setIdeas(prev => prev.filter(idea => idea !== selected));
          }
        }}
      />

      <Dialog open={!!resultModal} onOpenChange={(v) => !v && setResultModal(null)}>
        <DialogContent className="sm:!max-w-[800px] w-[95vw] p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl bg-white sm:!p-0 sm:!max-h-[85vh]">
          <DialogTitle className="sr-only">Imagen Generada</DialogTitle>
          <div className="flex flex-col">
            <div className="relative aspect-square md:aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
              {resultModal && (
                <img src={resultModal.url} className="w-full h-full object-contain" alt="Generated" />
              )}
              <div className="absolute top-6 right-6">
                 <Badge className="bg-emerald-500 text-white border-none px-4 py-2 text-xs font-black uppercase tracking-widest shadow-xl">
                    ¡Lista para usar!
                 </Badge>
              </div>
            </div>
            
            <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Tu pieza está lista</h3>
                <p className="text-sm text-slate-500 max-w-md">Nexo ha interpretado tu dirección de arte y marca con éxito. Ya puedes encontrarla en tu biblioteca.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button variant="outline" className="rounded-2xl h-14 px-8 font-bold" onClick={() => setResultModal(null)}>
                  Cerrar
                </Button>
                <Button className="rounded-2xl h-14 px-10 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px]" asChild>
                   <a href={resultModal?.url} target="_blank" rel="noreferrer">Descargar Original</a>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
