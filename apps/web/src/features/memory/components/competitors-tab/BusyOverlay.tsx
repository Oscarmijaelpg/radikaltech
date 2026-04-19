import { useEffect, useState, type ReactNode } from 'react';
import { Card, Icon } from '@radikal/ui';
import { CHARACTERS, type CharacterKey } from '@/shared/characters';

interface Props {
  title?: string;
  subtitle?: string;
  stages?: string[];
  estimatedSeconds?: number;
  character?: CharacterKey;
  children?: ReactNode;
}

export function BusyOverlay({
  title,
  subtitle,
  stages,
  estimatedSeconds,
  character,
  children,
}: Props) {
  const char = character ? CHARACTERS[character] : null;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="p-6 sm:p-7 max-w-md w-full space-y-5">
        {(title || char) && (
          <div className="flex items-start gap-3">
            {char && (
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${char.accent} p-[2px] shrink-0`}
              >
                <div className="w-full h-full rounded-[14px] bg-white overflow-hidden">
                  <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <p className="font-display font-black text-base text-slate-900">{title}</p>
              )}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        )}

        {stages && stages.length > 0 && (
          <ul className="space-y-2">
            {stages.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                <span
                  className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
                {s}
              </li>
            ))}
          </ul>
        )}

        {children && <div className="text-sm text-slate-700">{children}</div>}

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1.5">
            <Icon name="schedule" className="text-[14px]" />
            {elapsed}s transcurridos
          </span>
          {estimatedSeconds && <span>~{estimatedSeconds}s estimado</span>}
        </div>
      </Card>
    </div>
  );
}
