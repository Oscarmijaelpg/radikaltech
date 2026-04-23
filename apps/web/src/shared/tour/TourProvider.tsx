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
import { CHARACTERS, type CharacterKey } from '@/shared/characters';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: TourPlacement;
  character?: CharacterKey;
}

export interface TourDefinition {
  id: string;
  character?: CharacterKey;
  steps: TourStep[];
}

interface TourContextValue {
  visible: boolean;
  currentStep: number;
  steps: TourStep[];
  activeId: string | null;
  startTour: (def: TourDefinition) => void;
  nextStep: () => void;
  endTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

// Prefijo con versión: si los tours cambian de contenido, bumpea a v2 para re-mostrar.
const TOUR_STORAGE_PREFIX = 'radikal-tour-v1-';

export function tourStorageKey(id: string): string {
  return `${TOUR_STORAGE_PREFIX}${id}`;
}

export function isTourCompleted(id: string): boolean {
  try {
    return window.localStorage.getItem(tourStorageKey(id)) === '1';
  } catch {
    return false;
  }
}

export function markTourCompleted(id: string): void {
  try {
    window.localStorage.setItem(tourStorageKey(id), '1');
  } catch {
    /* ignore */
  }
}

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

const TOOLTIP_W = 340;
const TOOLTIP_MARGIN = 16;
const TOOLTIP_MIN_H = 200;

interface TooltipProps {
  rect: Rect;
  step: TourStep;
  tourCharacter?: CharacterKey;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}

function Tooltip({ rect, step, tourCharacter, index, total, onNext, onSkip }: TooltipProps) {
  const placement: TourPlacement = step.placement ?? 'right';
  const characterKey = step.character ?? tourCharacter ?? null;
  const character = characterKey ? CHARACTERS[characterKey] : null;

  let top: number;
  let left: number;
  switch (placement) {
    case 'top':
      top = rect.top - TOOLTIP_MIN_H - TOOLTIP_MARGIN;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
    case 'bottom':
      top = rect.top + rect.height + TOOLTIP_MARGIN;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - TOOLTIP_MIN_H / 2;
      left = rect.left - TOOLTIP_W - TOOLTIP_MARGIN;
      break;
    case 'right':
    default:
      top = rect.top + rect.height / 2 - TOOLTIP_MIN_H / 2;
      left = rect.left + rect.width + TOOLTIP_MARGIN;
      break;
  }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));
  top = Math.max(12, Math.min(top, vh - TOOLTIP_MIN_H - 12));

  const isLast = index === total - 1;

  return (
    <div
      role="dialog"
      aria-label={step.title}
      className="fixed z-[60] rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 animate-in fade-in zoom-in-95 duration-200"
      style={{ top, left, width: TOOLTIP_W }}
    >
      <div className="flex items-center justify-between mb-3">
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

      {character && (
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${character.accent} p-[2px] shrink-0`}
          >
            <div className="w-full h-full rounded-[14px] bg-white overflow-hidden">
              <img
                src={character.image}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              {character.name}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{character.role}</p>
          </div>
        </div>
      )}

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tourCharacter, setTourCharacter] = useState<CharacterKey | undefined>(undefined);
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

  const startTour = useCallback((def: TourDefinition) => {
    if (!def.steps.length) return;
    setSteps(def.steps);
    setCurrentStep(0);
    setActiveId(def.id);
    setTourCharacter(def.character);
    setVisible(true);
  }, []);

  const endTour = useCallback(() => {
    if (activeId) markTourCompleted(activeId);
    setVisible(false);
    setSteps([]);
    setCurrentStep(0);
    setActiveId(null);
    setTourCharacter(undefined);
  }, [activeId]);

  const nextStep = useCallback(() => {
    setCurrentStep((i) => {
      if (i + 1 >= steps.length) {
        setTimeout(() => endTour(), 0);
        return i;
      }
      return i + 1;
    });
  }, [steps.length, endTour]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, endTour]);

  const value = useMemo<TourContextValue>(
    () => ({ visible, currentStep, steps, activeId, startTour, nextStep, endTour }),
    [visible, currentStep, steps, activeId, startTour, nextStep, endTour],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {visible && step && (
        <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden={false}>
          {rect ? (
            <>
              <div
                className="absolute bg-black/60 pointer-events-auto transition-all"
                style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - 6) }}
                onClick={endTour}
              />
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
                tourCharacter={tourCharacter}
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
