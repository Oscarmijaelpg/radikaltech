import { Icon } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';

export interface QuickPrompt {
  icon: string;
  label: string;
  message: string;
  gradient: string;
}

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    icon: 'calendar_month',
    label: '¿Qué publico hoy?',
    message: 'Sugiere qué contenido debería publicar hoy basándote en mi marca, competidores y tendencias actuales.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: 'trending_up',
    label: '¿Qué está de moda?',
    message: 'Detecta las tendencias actuales en mi sector y dime cuáles son relevantes para mi marca.',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: 'groups',
    label: '¿Cómo va mi competencia?',
    message: 'Dame un resumen de mis competidores: métricas, engagement, y qué están haciendo mejor que yo.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: 'auto_awesome',
    label: 'Dame ideas de contenido',
    message: 'Propón 5 ideas de contenido para mis redes sociales basándote en mi marca, audiencia y lo que funciona en mi sector.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: 'psychology',
    label: 'Analiza mi marca',
    message: 'Haz un diagnóstico rápido de mi marca: identidad, posicionamiento, fortalezas y debilidades.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: 'analytics',
    label: 'Reporte completo',
    message: 'Genera un reporte 360° completo cruzando toda la información de mi marca, competidores y mercado.',
    gradient: 'from-fuchsia-500 to-pink-600',
  },
];

interface Props {
  onSelect: (message: string) => void;
  compact?: boolean;
}

export function QuickPrompts({ onSelect, compact }: Props) {
  return (
    <div className={cn('grid gap-2 sm:gap-3', compact ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
      {QUICK_PROMPTS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onSelect(p.message)}
          className={cn(
            'group text-left rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-all hover:-translate-y-0.5 active:scale-[0.98]',
            compact ? 'p-3' : 'p-4',
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'rounded-xl bg-gradient-to-br grid place-items-center text-white shadow-sm shrink-0',
              p.gradient,
              compact ? 'w-8 h-8' : 'w-10 h-10',
            )}>
              <Icon name={p.icon} className={cn(compact ? 'text-[16px]' : 'text-[20px]')} />
            </div>
            <p className={cn(
              'font-bold text-slate-900',
              compact ? 'text-xs' : 'text-sm',
            )}>
              {p.label}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
