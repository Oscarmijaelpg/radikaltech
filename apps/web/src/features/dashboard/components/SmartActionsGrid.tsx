import { Icon } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import type { SmartAction } from '../hooks/useSmartActions';

interface Props {
  actions: SmartAction[];
  loading: boolean;
}

export function SmartActionsGrid({ actions, loading }: Props) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 grid place-items-center text-white shadow-md">
          <Icon name="today" className="text-[16px] sm:text-[18px]" />
        </div>
        <div>
          <h2 className="font-display font-black text-lg sm:text-xl">Qué hacer hoy</h2>
          <p className="text-[10px] sm:text-[11px] text-slate-400">
            Acciones priorizadas según tu proyecto
          </p>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[120px] sm:h-[140px] rounded-2xl sm:rounded-3xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={a.action}
              aria-label={a.title}
              className={cn(
                'group relative text-left p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white shadow-lg bg-gradient-to-br overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] min-h-[110px] sm:min-h-[130px] flex flex-col',
                a.gradient,
              )}
            >
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/15 blur-2xl pointer-events-none group-hover:bg-white/25 transition-colors" />
              <div className="relative z-10 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <Icon name={a.icon} className="text-[20px] sm:text-[22px]" />
                  {a.tag && (
                    <span className="px-2 py-0.5 rounded-full bg-white/25 text-[9px] font-black uppercase tracking-wider">
                      {a.tag}
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-black leading-tight">{a.title}</p>
                <p className="text-xs sm:text-sm text-white/80 mt-0.5 sm:mt-1 leading-snug line-clamp-2">
                  {a.description}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold pt-2 opacity-80 group-hover:opacity-100">
                  Ir
                  <Icon
                    name="arrow_forward"
                    className="text-[14px] transition-transform group-hover:translate-x-1"
                  />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
