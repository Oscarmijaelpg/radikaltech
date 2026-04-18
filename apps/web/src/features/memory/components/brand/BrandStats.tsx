import {
  Card,
  Icon,
} from '@radikal/ui';
import type { BrandProfile } from '../../api/memory';
import { SuggestedPaletteBlock } from './SuggestedPaletteBlock';

export function BrandStats({
  projectId,
  brand,
  palette,
  paletteSuggested,
  hasDistinctSuggested,
}: {
  projectId: string;
  brand: BrandProfile | null | undefined;
  palette: string[];
  paletteSuggested: string[];
  hasDistinctSuggested: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
      {/* Paleta */}
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-pink-50 to-cyan-50 border-white">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="palette" className="text-[20px] text-[hsl(var(--color-primary))]" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
            Colores de marca
          </h4>
        </div>
        {palette.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {palette.slice(0, 6).map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-white shadow-lg"
                  style={{ backgroundColor: c }}
                  title={c}
                />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                  {c}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-slate-400 py-2">Aún sin paleta</p>
        )}
        {hasDistinctSuggested && (
          <SuggestedPaletteBlock projectId={projectId} suggested={paletteSuggested} />
        )}
      </Card>

      {/* Voice tone */}
      <Card className="p-4 sm:p-6 bg-white border-white">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="record_voice_over" className="text-[20px] text-[hsl(var(--color-primary))]" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
            Tono de voz
          </h4>
        </div>
        {brand?.voice_tone ? (
          <>
            <p className="font-display text-lg sm:text-xl font-black text-slate-900 line-clamp-2">
              {(brand.voice_tone.split(/[.,\n]/)[0] ?? brand.voice_tone).trim()}
            </p>
            {brand.visual_direction && (
              <p className="text-xs text-slate-500 mt-2 line-clamp-2 font-medium">
                {brand.visual_direction}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs italic text-slate-400 py-2">Aún sin tono definido</p>
        )}
      </Card>

      {/* Audiencia */}
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-cyan-50 to-pink-50 border-white sm:col-span-2 md:col-span-1">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="groups" className="text-[20px] text-[hsl(var(--color-primary))]" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
            Audiencia
          </h4>
        </div>
        {brand?.target_audience ? (
          <p className="text-sm text-slate-700 font-medium line-clamp-4 leading-relaxed">
            {brand.target_audience}
          </p>
        ) : (
          <p className="text-xs italic text-slate-400 py-2">
            Define tu audiencia objetivo
          </p>
        )}
      </Card>
    </div>
  );
}
