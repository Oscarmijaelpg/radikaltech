import { ChatInput } from './ChatInput';
import { QuickPrompts } from './QuickPrompts';

interface Props {
  disabled: boolean;
  onStart: (message: string) => Promise<void> | void;
  onOpenPicker: () => void;
  onOpenSidebar: () => void;
}

export function WelcomeScreen({ disabled, onStart, onOpenPicker, onOpenSidebar }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center px-4 pt-3 md:hidden">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shadow-xl mb-4">
            <span className="material-symbols-outlined text-[32px]">forum</span>
          </div>
          <h2 className="font-display font-black text-2xl md:text-3xl text-slate-900">
            ¿En qué te ayudamos?
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Escribe lo que necesitas o elige una opción rápida.
          </p>
        </div>

        <QuickPrompts onSelect={onStart} />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">o escribe lo que quieras</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="relative">
          <ChatInput
            disabled={disabled}
            onSend={onStart}
            placeholder="Escribe tu pregunta y empezamos..."
          />
        </div>

        <p className="text-center text-xs text-slate-400">
          ¿Quieres elegir un agente específico?{' '}
          <button
            type="button"
            onClick={onOpenPicker}
            className="text-[hsl(var(--color-primary))] font-semibold hover:underline"
          >
            Crear conversación manual
          </button>
        </p>
      </div>
    </div>
  );
}
