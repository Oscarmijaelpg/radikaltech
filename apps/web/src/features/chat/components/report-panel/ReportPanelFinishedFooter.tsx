import { Icon } from '@radikal/ui';

export function ReportPanelFinishedFooter() {
  return (
    <div className="mx-4 sm:mx-6 mb-8 sm:mb-12 p-4 sm:p-6 bg-[hsl(var(--color-primary)/0.03)] border-2 border-[hsl(var(--color-primary)/0.1)] rounded-2xl sm:rounded-3xl flex items-center gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[hsl(var(--color-primary)/0.1)] grid place-items-center shrink-0">
        <Icon name="check_circle" className="text-[hsl(var(--color-primary))] text-2xl sm:text-3xl" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--color-primary))]">
          Tarea Finalizada
        </span>
        <p className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tighter leading-none mt-1">
          El informe está terminado
        </p>
        <p className="text-xs text-slate-500 mt-1 sm:mt-2 font-medium truncate">
          Datos analizados y reporte estructurado para tu marca.
        </p>
      </div>
    </div>
  );
}
