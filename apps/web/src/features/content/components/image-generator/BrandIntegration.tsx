import {
  Icon,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@radikal/ui';
import type { ContentAsset } from '../../api/content';

interface Props {
  logo: ContentAsset | undefined;
  palette: string[];
  useLogo: boolean;
  useBrandPalette: boolean;
  mode: 'referential' | 'creative';
  onChangeUseLogo: (v: boolean) => void;
  onChangeUseBrandPalette: (v: boolean) => void;
  onChangeMode: (v: 'referential' | 'creative') => void;
}

export function BrandIntegration({
  logo,
  palette,
  useLogo,
  useBrandPalette,
  mode,
  onChangeUseLogo,
  onChangeUseBrandPalette,
  onChangeMode,
}: Props) {
  const hasLogo = !!logo;
  const hasPalette = palette.length > 0;

  return (
    <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-cyan-50 border border-white/60 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="workspace_premium" className="text-[18px] text-[hsl(var(--color-primary))]" />
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">
          Integración con tu marca
        </h4>
      </div>

      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/70">
        <div className="flex items-center gap-3 min-w-0">
          {hasLogo ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-white shadow-sm">
              <img
                src={logo!.asset_url}
                alt="logo"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center shrink-0">
              <Icon name="image" className="text-[18px] text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">
              Usar mi logo como referencia
            </p>
            <p className="text-[11px] text-slate-500 leading-tight">
              {hasLogo
                ? 'Gemini 2.5 Flash Image preservará tu logo tal cual'
                : 'Sube tu logo en Memoria → Marca para activarlo'}
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Switch
                checked={useLogo && hasLogo}
                onCheckedChange={onChangeUseLogo}
                disabled={!hasLogo}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[240px]">
            Gemini 2.5 preservará tu logo exactamente como es
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/70">
        <div className="flex items-center gap-3 min-w-0">
          {hasPalette ? (
            <div className="flex items-center gap-1 shrink-0">
              {palette.slice(0, 5).map((c, i) => (
                <span
                  key={i}
                  className="w-6 h-6 rounded-md border border-white shadow-sm"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center shrink-0">
              <Icon name="palette" className="text-[18px] text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">
              Respetar paleta de marca
            </p>
            <p className="text-[11px] text-slate-500 leading-tight">
              {hasPalette
                ? 'La IA se ceñirá a los colores de tu marca'
                : 'Genera tu identidad en Memoria → Marca'}
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Switch
                checked={useBrandPalette && hasPalette}
                onCheckedChange={onChangeUseBrandPalette}
                disabled={!hasPalette}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[240px]">
            Los colores generados coincidirán con tu paleta oficial
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Selector de Modo */}
      <div className="pt-2 border-t border-white/40">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-1">
          Modo de Generación
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeMode('referential')}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
              mode === 'referential'
                ? 'bg-[hsl(var(--color-primary)/0.05)] border-[hsl(var(--color-primary))] shadow-sm'
                : 'bg-white/50 border-transparent hover:bg-white/80'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg grid place-items-center ${mode === 'referential' ? 'bg-[hsl(var(--color-primary))] text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Icon name="biotech" className="text-[18px]" />
            </div>
            <div className="text-center">
              <p className={`text-xs font-bold ${mode === 'referential' ? 'text-[hsl(var(--color-primary))]' : 'text-slate-700'}`}>Referencial</p>
              <p className="text-[9px] text-slate-500">Fidelidad 100%</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode('creative')}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
              mode === 'creative'
                ? 'bg-[hsl(var(--color-primary)/0.05)] border-[hsl(var(--color-primary))] shadow-sm'
                : 'bg-white/50 border-transparent hover:bg-white/80'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg grid place-items-center ${mode === 'creative' ? 'bg-[hsl(var(--color-primary))] text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Icon name="auto_awesome" className="text-[18px]" />
            </div>
            <div className="text-center">
              <p className={`text-xs font-bold ${mode === 'creative' ? 'text-[hsl(var(--color-primary))]' : 'text-slate-700'}`}>Creativo</p>
              <p className="text-[9px] text-slate-500">ADN de Marca</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
