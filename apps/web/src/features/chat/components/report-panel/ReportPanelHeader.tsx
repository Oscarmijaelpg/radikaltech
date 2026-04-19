import { Icon } from '@radikal/ui';

interface Props {
  isThinking: boolean;
  onClose: () => void;
}

export function ReportPanelHeader({ isThinking, onClose }: Props) {
  return (
    <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center">
          <Icon name="description" className="text-[hsl(var(--color-primary))] text-xl" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 leading-tight text-sm sm:text-base">
            Informe Detallado
          </h2>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Generado por IA
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {isThinking && (
          <div className="flex items-center gap-2 bg-[hsl(var(--color-primary)/0.05)] px-3 py-1 rounded-full border border-[hsl(var(--color-primary)/0.2)] shadow-sm">
            <span className="text-[10px] font-bold text-[hsl(var(--color-primary))] uppercase tracking-widest animate-pulse">
              Analizando
            </span>
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce" />
              <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]" />
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>
    </header>
  );
}
