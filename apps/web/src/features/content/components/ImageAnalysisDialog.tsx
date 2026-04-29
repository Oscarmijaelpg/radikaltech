import { Dialog, DialogContent, DialogTitle, Button, Icon } from '@radikal/ui';

export interface ImageAssetMinimal {
  id?: string;
  asset_url: string;
  aesthetic_score?: number | null;
  ai_description?: string | null;
  marketing_feedback?: string | null;
  tags?: string[];
  metadata?: Record<string, any> | null;
}

interface Props {
  asset: ImageAssetMinimal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageAnalysisDialog({ asset, open, onOpenChange }: Props) {
  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
        <DialogTitle className="sr-only">Análisis de imagen</DialogTitle>
        <div className="flex flex-col md:flex-row h-full min-h-[500px]">
          {/* Panel Izquierdo: Imagen */}
          <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-auto relative group">
            <img 
              src={asset.asset_url} 
              className="w-full h-full object-contain max-h-[700px] transition-transform duration-500 group-hover:scale-105" 
              alt="Preview" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>

          {/* Panel Derecho: Datos */}
          <div className="w-full md:w-[360px] p-8 bg-white flex flex-col gap-6 overflow-y-auto">
            {/* Score */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Puntuación Estética</p>
              {asset.aesthetic_score != null ? (
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-slate-900">{Number(asset.aesthetic_score).toFixed(1)}</span>
                  <span className="text-slate-400 font-bold mb-1.5">/ 10</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-500 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                  <Icon name="hourglass_empty" className="text-[16px]" />
                  <p className="text-xs font-bold italic uppercase tracking-tight">Pendiente de análisis</p>
                </div>
              )}
            </div>

            {/* 1. Copy Original (Social Media) */}
            {asset.metadata?.caption && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Copy de Redes Sociales</p>
                <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner max-h-[150px] overflow-y-auto scrollbar-hide">
                  {asset.metadata.caption}
                </div>
              </div>
            )}

            {/* 2. Análisis de Dirección de Arte (Visual DNA) */}
            {asset.ai_description && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Análisis de Dirección de Arte</p>
                <div className="text-sm text-slate-700 leading-relaxed bg-blue-50/30 p-5 rounded-2xl border border-blue-100 shadow-inner max-h-[250px] overflow-y-auto scrollbar-hide italic">
                  {asset.ai_description}
                </div>
              </div>
            )}

            {/* 3. Análisis de Marketing (Feedback) */}
            {asset.marketing_feedback && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Evaluación de Marketing</p>
                <div className="text-sm text-slate-700 leading-relaxed bg-violet-50/30 p-5 rounded-2xl border border-violet-100 shadow-inner max-h-[250px] overflow-y-auto scrollbar-hide">
                  {asset.marketing_feedback}
                </div>
              </div>
            )}

            {/* Etiquetas */}
            {asset.tags && asset.tags.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">ADN Visual Detectado</p>
                <div className="flex flex-wrap gap-1.5">
                  {asset.tags
                    .filter(t => !['user_uploaded', 'reference', 'social_auto', 'generated'].includes(t))
                    .map(t => (
                    <span key={t} className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 uppercase tracking-wider border border-violet-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Button 
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg hover:shadow-xl transition-all active:scale-95" 
                asChild
              >
                <a href={asset.asset_url} download target="_blank" rel="noreferrer">
                  <Icon name="download" className="mr-2" /> Descargar Original
                </a>
              </Button>
              <p className="text-[9px] text-slate-400 text-center font-medium">Resolución original · Almacenamiento seguro</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
