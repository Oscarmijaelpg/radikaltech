import { useState, useMemo } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Icon,
  Spinner,
  Badge,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useAssets, useGenerateImage, type GenerateImageResult } from '../../api/content';
import type { ContentIdea } from './api';
import { AssetUploader } from '../AssetUploader';
import clsx from 'clsx';

interface Props {
  idea: ContentIdea | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: (res: GenerateImageResult) => void;
}

const PLATFORM_SIZES: Record<string, string> = {
  Instagram: '1024x1024',
  TikTok: '1024x1792',
  LinkedIn: '1792x1024',
  Twitter: '1792x1024',
};

export function VisualContract({ idea, open, onOpenChange, onSuccess }: Props) {
  const { activeProject } = useProject();
  const [mode, setMode] = useState<'creative' | 'referential'>('creative');
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateImageResult | null>(null);
  const [openUploadModal, setOpenUploadModal] = useState(false);

  const { data: assets, isLoading: isLoadingAssets } = useAssets(activeProject?.id, { type: 'image' });
  const generate = useGenerateImage();

  const logos = useMemo(() => assets?.filter(a => a.tags.includes('logo')) || [], [assets]);
  const references = useMemo(() => assets?.filter(a => a.tags.some(t => ['instagram', 'web', 'reference', 'social_auto'].includes(t))) || [], [assets]);

  const handleGenerate = async () => {
    if (!idea || !activeProject) return;

    const refIds: string[] = [];
    if (selectedLogo) refIds.push(selectedLogo);
    refIds.push(...Array.from(selectedRefs));

    let modeInstructions = '';
    if (mode === 'referential') {
      modeInstructions = `
        ### IMAGE-COMPOSITION PROTOCOL: COHESIVE INTEGRATION ###
        ### MANDATORY ASPECT RATIO: 1:1 (SQUARE) ###
        STRICT ROLE: You are an expert art director and compositor.
        - TASK: Do NOT just paste the images together like a basic collage. Create a cohesive, realistic, and professional scene or editorial composition using all provided visual elements.
        - SUBJECT LOCK: You may change the perspective, angle, lighting, or setting to make the composition dynamic and logical, BUT you MUST strictly maintain the exact identity, textures, and label details of the main product/subject. It must still be the exact same product.
        - AUTHORIZED: Better lighting, high-end studio or lifestyle background, sharp focus, dynamic angles.
        - NEGATIVE: Do not make a flat collage, do not distort the product shape or label.
      `;
    } else {
      modeInstructions = `
        ### BRAND-CENTRIC CREATIVE MODE ###
        ### MANDATORY ASPECT RATIO: 1:1 (SQUARE) ###
        CORE RULE: Even in creative mode, you MUST respect the brand DNA.
        - COLOR PALETTE: Extract and use ONLY the exact hex codes/colors from the reference images (Logo and Assets).
        - LOGO INTEGRITY: Place the brand logo clearly. NEVER alter its shape, font, or color.
        - SCENE: Create a new setting (lifestyle/studio) but keep the identity clean and professional.
        - NEGATIVE: No chaotic elements, no distorted logos, no neon colors unless present in the brand.
      `;
    }

    const fullPrompt = `
      TASK: Generate a high-quality professional marketing image for: ${idea.title}.
      VISUAL CONCEPT: ${idea.visual_suggestion}.
      PLATFORM: ${idea.platform}.
      ${modeInstructions}
      ### TEXT & CONTENT RULE ###
      - USE REAL TEXT: If the image includes typography, use the actual title: "${idea.title}" and the brand name if available.
      - NO PLACEHOLDERS: Strictly PROHIBITED to include text like "[TEXT OVERLAY]", "[Insert Title Here]", "Your Text Here", or any brackets/placeholders.
      - If you cannot place the real text perfectly, prefer a clean image with NO text at all rather than using placeholders.
      STYLE: Professional photography, clean, premium, 4k, marketing quality.
    `.trim();

    try {
      const res = await generate.mutateAsync({
        prompt: fullPrompt,
        size: PLATFORM_SIZES[idea.platform] || '1024x1024',
        style: mode === 'creative' ? 'vivid' : 'natural',
        project_id: activeProject.id,
        reference_asset_ids: refIds.length > 0 ? refIds : undefined,
        variations: 1,
        source_section: 'nexo_ideas',
      });
      setResult(res);
      onSuccess?.(res);
    } catch (err) {
      console.error('Generation failed', err);
    }
  };

  const handleClose = () => {
    setResult(null);
    setSelectedRefs(new Set());
    setSelectedLogo(null);
    setMode('creative');
    onOpenChange(false);
  };

  if (!idea) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:!max-w-[1000px] w-[95vw] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white sm:!p-0 sm:!max-h-[85vh] sm:!h-[750px]">
        {/* Accesibilidad */}
        <DialogTitle className="sr-only">Contrato Visual - {idea.title}</DialogTitle>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          
          {/* Columna Izquierda: El Contrato - Scroll Independiente */}
          <div className="flex-1 bg-slate-50/50 border-r border-slate-100 overflow-y-auto p-8 md:p-12 scroll-smooth">
            <header className="space-y-4 mb-10">
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-900 text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                  Contrato Visual
                </Badge>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                  {idea.platform}
                </Badge>
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-[1.1]">
                {idea.title}
              </h2>
            </header>

            <div className="space-y-12">
              <section>
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Concepto Estratégico
                </h4>
                <div className="bg-white p-7 rounded-[2rem] border border-slate-200/60 shadow-sm leading-relaxed text-slate-600 text-base">
                  {idea.description}
                </div>
              </section>

              <section>
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                   Dirección de Arte
                </h4>
                <div className="bg-amber-50/40 p-7 rounded-[2rem] border border-amber-100/50 flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0 shadow-xl shadow-amber-100">
                     <Icon name="palette" className="text-white text-xl" />
                  </div>
                  <p className="text-base text-amber-900/80 leading-relaxed font-bold italic mt-1">
                    "{idea.visual_suggestion}"
                  </p>
                </div>
              </section>

              {result && (
                <section className="animate-in fade-in zoom-in duration-700 pb-10">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-4 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                     Resultado Nexo
                  </h4>
                  <div className="relative group rounded-[3rem] overflow-hidden border-[12px] border-white shadow-2xl bg-white aspect-square">
                    <img src={result.url} alt="Result" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Button variant="secondary" className="rounded-2xl font-black uppercase tracking-widest text-[11px] px-8 py-6" asChild>
                          <a href={result.url} target="_blank" rel="noreferrer">Ver en alta resolución</a>
                       </Button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Columna Derecha: Configuración - Header y Footer Fijos, Cuerpo con Scroll */}
          <div className="w-full md:w-[400px] flex flex-col bg-white border-l border-slate-50 overflow-hidden">
            
            {/* Header Fijo */}
            <div className="p-8 pb-4 border-b border-slate-50">
              <h3 className="font-black text-slate-900 text-2xl tracking-tight flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Icon name="settings" className="text-slate-500 text-xl" />
                </div>
                Configurar
              </h3>
            </div>

            {/* Cuerpo Scrolleable */}
            <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-10 scroll-smooth">
              <div className="space-y-10">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Estilo de Generación</h4>
                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-100 rounded-[2rem]">
                     <button
                      onClick={() => setMode('creative')}
                      className={clsx(
                        "py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all",
                        mode === 'creative' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-slate-600"
                      )}
                     >
                      Creativo
                     </button>
                     <button
                      onClick={() => setMode('referential')}
                      className={clsx(
                        "py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all",
                        mode === 'referential' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-slate-600"
                      )}
                     >
                      Apegado al referente
                     </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Identidad de Marca</h4>
                  {logos.length > 0 ? (
                     <div className="flex flex-wrap gap-3">
                      {logos.map(logo => (
                        <button
                          key={logo.id}
                          onClick={() => setSelectedLogo(selectedLogo === logo.id ? null : logo.id)}
                          className={clsx(
                            "w-14 h-14 rounded-2xl border-4 transition-all overflow-hidden bg-slate-50 p-2",
                            selectedLogo === logo.id ? "border-amber-500 shadow-xl shadow-amber-100" : "border-slate-50 hover:border-slate-200"
                          )}
                        >
                          <img src={logo.asset_url} className="w-full h-full object-contain" alt="Logo" />
                        </button>
                      ))}
                     </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-2xl">Sin logos.</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Referencias Sira</h4>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setOpenUploadModal(true)} className="text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1">
                        <Icon name="add" className="text-[14px]" /> Añadir imágenes
                      </button>
                      {mode === 'referential' && selectedRefs.size === 0 && <span className="text-[10px] font-black text-amber-600 animate-pulse uppercase tracking-widest">Requerido</span>}
                      {selectedRefs.size > 0 && (
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                          {selectedRefs.size}/3 seleccionadas
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isLoadingAssets ? (
                    <div className="flex items-center gap-3 text-slate-400 py-4">
                      <Spinner className="h-4 w-4" />
                      <span className="text-[10px] uppercase font-black tracking-[0.2em]">Cargando...</span>
                    </div>
                  ) : references.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {references.map(ref => {
                        const isSelected = selectedRefs.has(ref.id);
                        const isDisabled = !isSelected && selectedRefs.size >= 3;
                        return (
                          <button
                            key={ref.id}
                            onClick={() => {
                              setSelectedRefs(prev => {
                                const next = new Set(prev);
                                if (next.has(ref.id)) next.delete(ref.id);
                                else if (next.size < 3) next.add(ref.id);
                                return next;
                              });
                            }}
                            disabled={isDisabled}
                            className={clsx(
                              "aspect-square rounded-2xl border-4 transition-all overflow-hidden relative group",
                              isSelected ? "border-amber-500 shadow-xl shadow-amber-100" : "border-slate-50 hover:border-slate-200",
                              isDisabled && "opacity-30 cursor-not-allowed"
                            )}
                          >
                            <img src={ref.asset_url} className="w-full h-full object-cover" alt="Ref" />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-[9px] font-black">{Array.from(selectedRefs).indexOf(ref.id) + 1}</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic bg-slate-50 p-4 rounded-[1.5rem]">No hay referencias visuales.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Fijo con Botón de Acción */}
            <div className="p-8 bg-white border-t border-slate-50">
              <Button
                onClick={handleGenerate}
                disabled={generate.isPending || (mode === 'referential' && selectedRefs.size === 0)}
                className="w-full h-16 rounded-[1.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-[0.25em] text-[11px] shadow-2xl shadow-slate-200 transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95 disabled:opacity-40"
              >
                {generate.isPending ? (
                  <>
                    <Spinner className="h-5 w-5 mr-3" />
                    GENERANDO...
                  </>
                ) : (
                  <>
                    <Icon name="auto_awesome" className="text-[20px] mr-3 text-amber-400" />
                    GENERAR PIEZA
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={openUploadModal} onOpenChange={setOpenUploadModal}>
          <DialogContent className="sm:max-w-[700px] rounded-[2rem]">
            <DialogTitle className="text-2xl font-black mb-4">Añadir imágenes de marca</DialogTitle>
            <AssetUploader tags={['user_uploaded', 'reference', 'social_auto']} onUploadComplete={() => setOpenUploadModal(false)} />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
