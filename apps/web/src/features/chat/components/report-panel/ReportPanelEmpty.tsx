import { Icon } from '@radikal/ui';

export function ReportPanelEmpty() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pt-20 animate-in fade-in duration-1000">
      <div className="relative">
        <div className="absolute inset-0 bg-[hsl(var(--color-primary))] rounded-full blur-2xl opacity-20 animate-pulse" />
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] border-4 border-white overflow-hidden shadow-2xl relative z-10 bg-[hsl(var(--color-primary)/0.1)] grid place-items-center">
          <Icon name="auto_awesome" className="text-[hsl(var(--color-primary))] text-[48px]" />
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter">
          Generando informe
        </h3>
        <div className="flex flex-col items-center gap-2">
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">
            Creando tu informe estratégico
          </p>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.3s]" />
          </div>
        </div>
      </div>
    </div>
  );
}
