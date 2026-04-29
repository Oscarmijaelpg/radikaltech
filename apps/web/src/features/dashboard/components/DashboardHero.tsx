import { Tooltip, TooltipContent, TooltipTrigger } from '@radikal/ui';
import { CountUp } from '@/shared/ui/CountUp';
import { logoContainerStyle, type LogoBrightness } from '@/shared/hooks/useProjectLogo';
import type { ProjectStats } from '../api/stats';
import { KPI_META } from '../kpi-meta';

interface Props {
  firstName: string;
  activeProjectLabel: string | null;
  logo: string | null | undefined;
  logoBrightness: LogoBrightness;
  stats: ProjectStats | undefined;
  loading: boolean;
}

export function DashboardHero({
  firstName,
  activeProjectLabel,
  logo,
  logoBrightness,
  stats,
  loading,
}: Props) {
  return (
    <header className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[28px] bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] p-4 sm:p-5 md:p-7 text-white shadow-xl">
      <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="relative z-10 flex items-center gap-3 sm:gap-4">
        {logo && (
          <div
            className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl border border-white/40 overflow-hidden shrink-0 grid place-items-center shadow-lg"
            style={logoContainerStyle(logoBrightness)}
          >
            <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black tracking-tight">
            Hola, {firstName}
          </h1>
          <p className="text-white/80 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base truncate">
            {activeProjectLabel ? `Trabajando en ${activeProjectLabel}` : 'Vista global de tu cuenta'}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          {KPI_META.slice(0, 4).map((m) => (
            <Tooltip key={m.key}>
              <TooltipTrigger asChild>
                <button type="button" className="text-center cursor-default">
                  <p className="text-2xl font-black">
                    {loading ? '—' : <CountUp end={stats?.[m.key] ?? 0} />}
                  </p>
                  <p className="text-[10px] font-semibold opacity-70">{m.label}</p>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px]">
                {m.tooltip}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </header>
  );
}
