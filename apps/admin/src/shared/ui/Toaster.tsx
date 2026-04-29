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
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
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

const VARIANT_ICON = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
} as const;

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: 'bg-white border border-slate-200 text-slate-900',
  success: 'bg-emerald-500 text-white border-transparent',
  error: 'bg-red-500 text-white border-transparent',
  warning: 'bg-amber-500 text-white border-transparent',
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
          const Icon = VARIANT_ICON[variant];
          return (
            <Toast
              key={t.id}
              open={t.open}
              onOpenChange={(open) => {
                if (!open) {
                  dismiss(t.id);
                  setTimeout(() => remove(t.id), 200);
                }
              }}
              className={clsx('animate-in slide-in-from-top-2 fade-in', VARIANT_CLASSES[variant])}
            >
              <div className="flex items-start gap-3 w-full">
                <Icon size={20} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  {t.title && <ToastTitle>{t.title}</ToastTitle>}
                  {t.description && <ToastDescription>{t.description}</ToastDescription>}
                </div>
              </div>
              <ToastClose aria-label="Cerrar" />
            </Toast>
          );
        })}
        <ToastViewport className="fixed z-[100] top-0 right-0 flex max-h-screen w-full flex-col gap-2 p-4 outline-none sm:max-w-[420px]" />
      </RadixToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
