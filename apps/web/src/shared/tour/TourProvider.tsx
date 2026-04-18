import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SectionTitle } from '@radikal/ui';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  target: string; // selector CSS
  title: string;
  description: string;
  placement?: TourPlacement;
}

interface TourContextValue {
  visible: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (steps: TourStep[]) => void;
  nextStep: () => void;
  endTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export const TOUR_STORAGE_KEY = 'radikal-tour-completed';

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour debe usarse dentro de <TourProvider>');
  return ctx;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRect(selector: string): Rect | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface TooltipProps {
  rect: Rect;
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}

function Tooltip({ rect, step, index, total, onNext, onSkip }: TooltipProps) {
  const placement: TourPlacement = step.placement ?? 'right';
  const margin = 16;
  let top = 0;
  let left = 0;
  const tooltipW = 320;
  const tooltipH = 180;
  switch (placement) {
    case 'top':
      top = rect.top - tooltipH - margin;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case 'bottom':
      top = rect.top + rect.height + margin;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - margin;
      break;
    case 'right':
    default:
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left + rect.width + margin;
      break;
  }
  // Clamp a la ventana
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  left = Math.max(12, Math.min(left, vw - tooltipW - 12));
  top = Math.max(12, Math.min(top, vh - tooltipH - 12));

  const isLast = index === total - 1;

  return (
    <div
      role="dialog"
      aria-label={step.title}
      className="fixed z-[60] w-[320px] rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 animate-in fade-in zoom-in-95 duration-200"
      style={{ top, left }}
    >
      <div className="flex items-center justify-between mb-2">
        <SectionTitle className="text-[hsl(var(--color-primary))]">
          Paso {index + 1} de {total}
        </SectionTitle>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-slate-400 hover:text-slate-700 font-semibold"
        >
          Saltar
        </button>
      </div>
      <h4 className="font-display font-black text-lg text-slate-900 mb-1">{step.title}</h4>
      <p className="text-sm text-slate-600 leading-snug mb-4">{step.description}</p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-4 py-2 rounded-xl bg-[hsl(var(--color-primary))] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
        >
          {isLast ? 'Terminar' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  const step = steps[currentStep];

  const updateRect = useCallback(() => {
    if (!step) return;
    const r = getRect(step.target);
    setRect(r);
  }, [step]);

  useLayoutEffect(() => {
    if (!visible || !step) return;
    updateRect();
    const onResize = () => updateRect();
    const tick = () => {
      updateRect();
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [visible, step, updateRect]);

  const startTour = useCallback((nextSteps: TourStep[]) => {
    if (!nextSteps.length) return;
    setSteps(nextSteps);
    setCurrentStep(0);
    setVisible(true);
  }, []);

  const endTour = useCallback(() => {
    setVisible(false);
    setSteps([]);
    setCurrentStep(0);
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((i) => {
      if (i + 1 >= steps.length) {
        // End en el siguiente tick para no colisionar con setState
        setTimeout(() => endTour(), 0);
        return i;
      }
      return i + 1;
    });
  }, [steps.length, endTour]);

  // ESC para salir
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, endTour]);

  const value = useMemo<TourContextValue>(
    () => ({ visible, currentStep, steps, startTour, nextStep, endTour }),
    [visible, currentStep, steps, startTour, nextStep, endTour],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {visible && step && (
        <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden={false}>
          {/* Backdrop con hueco (4 paneles alrededor del rect) */}
          {rect ? (
            <>
              {/* top */}
              <div
                className="absolute bg-black/60 pointer-events-auto transition-all"
                style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - 6) }}
                onClick={endTour}
              />
              {/* bottom */}
              <div
                className="absolute bg-black/60 pointer-events-auto transition-all"
                style={{
                  top: rect.top + rect.height + 6,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                onClick={endTour}
              />
              {/* left */}
              <div
                className="absolute bg-black/60 pointer-events-auto transition-all"
                style={{
                  top: Math.max(0, rect.top - 6),
                  left: 0,
                  width: Math.max(0, rect.left - 6),
                  height: rect.height + 12,
                }}
                onClick={endTour}
              />
              {/* right */}
              <div
                className="absolute bg-black/60 pointer-events-auto transition-all"
                style={{
                  top: Math.max(0, rect.top - 6),
                  left: rect.left + rect.width + 6,
                  right: 0,
                  height: rect.height + 12,
                }}
                onClick={endTour}
              />
              {/* Highlight ring */}
              <div
                className="absolute rounded-xl ring-4 ring-[hsl(var(--color-primary))] pointer-events-none transition-all"
                style={{
                  top: rect.top - 6,
                  left: rect.left - 6,
                  width: rect.width + 12,
                  height: rect.height + 12,
                }}
              />
              <Tooltip
                rect={rect}
                step={step}
                index={currentStep}
                total={steps.length}
                onNext={nextStep}
                onSkip={endTour}
              />
            </>
          ) : (
            <div
              className="absolute inset-0 bg-black/60 pointer-events-auto"
              onClick={endTour}
            />
          )}
        </div>
      )}
    </TourContext.Provider>
  );
}
