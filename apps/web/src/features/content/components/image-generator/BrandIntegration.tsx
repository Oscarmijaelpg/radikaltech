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
  onChangeUseLogo: (v: boolean) => void;
  onChangeUseBrandPalette: (v: boolean) => void;
}

export function BrandIntegration({
  logo,
  palette,
  useLogo,
  useBrandPalette,
  onChangeUseLogo,
  onChangeUseBrandPalette,
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
    </div>
  );
}
