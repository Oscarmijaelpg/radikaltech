import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
  ToastViewport,
} from '@radikal/ui';
import { cn } from '@/shared/utils/cn';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  onClick?: () => void;
}

interface ToastItem extends ToastOptions {
  id: string;
  open: boolean;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, string> = {
  default: 'info',
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: 'bg-white border border-[hsl(var(--color-border))] text-slate-900',
  success: 'bg-emerald-500 text-white border-transparent',
  error: 'bg-red-500 text-white border-transparent',
  warning: 'bg-amber-500 text-white border-transparent',
};

const VARIANT_ICON_CLASSES: Record<ToastVariant, string> = {
  default: 'text-slate-500',
  success: 'text-white',
  error: 'text-white',
  warning: 'text-white',
};

let idSeq = 0;
const nextId = () => `toast-${Date.now()}-${idSeq++}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = nextId();
      const duration = opts.duration ?? 4000;
      setItems((prev) => [...prev, { ...opts, id, open: true }]);
      if (duration > 0) {
        const t = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, t);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToastProvider swipeDirection="right" duration={Infinity}>
        {children}
        {items.map((t) => {
          const variant = t.variant ?? 'default';
          return (
            <Toast
              key={t.id}
              open={t.open}
              onOpenChange={(open) => {
                if (!open) {
                  dismiss(t.id);
                  // Defer unmount so exit animation can run
                  setTimeout(() => remove(t.id), 200);
                }
              }}
              className={cn(
                'animate-in slide-in-from-top-2 fade-in',
                VARIANT_CLASSES[variant],
                t.onClick && 'cursor-pointer hover:brightness-110 transition-[filter]',
              )}
              onClick={(e) => {
                if (!t.onClick) return;
                const target = e.target as HTMLElement;
                // No disparar si se hizo click en el botón de cerrar
                if (target.closest('[toast-close]') || target.closest('button')) return;
                t.onClick();
                dismiss(t.id);
                setTimeout(() => remove(t.id), 200);
              }}
            >
              <div className="flex items-start gap-3 w-full">
                <span
                  className={cn(
                    'material-symbols-outlined text-[22px] shrink-0',
                    VARIANT_ICON_CLASSES[variant],
                  )}
                  aria-hidden
                >
                  {VARIANT_ICON[variant]}
                </span>
                <div className="flex-1 min-w-0">
                  {t.title && <ToastTitle>{t.title}</ToastTitle>}
                  {t.description && (
                    <ToastDescription>{t.description}</ToastDescription>
                  )}
                  {t.onClick && (
                    <p className="mt-1 text-[11px] font-semibold opacity-90 underline underline-offset-2">
                      Toca para ver
                    </p>
                  )}
                </div>
              </div>
              <ToastClose aria-label="Cerrar notificación" />
            </Toast>
          );
        })}
        <ToastViewport
          className={cn(
            'fixed z-[100] flex max-h-screen w-full flex-col gap-2 p-4 outline-none',
            // Mobile: top center
            'top-0 left-1/2 -translate-x-1/2 items-center',
            // Desktop: top right
            'sm:left-auto sm:right-0 sm:translate-x-0 sm:top-0 sm:bottom-auto sm:max-w-[420px] sm:items-stretch',
          )}
        />
      </RadixToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
