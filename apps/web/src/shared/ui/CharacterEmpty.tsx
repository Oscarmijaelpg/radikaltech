import { Button } from '@radikal/ui';
import { Link } from 'react-router-dom';
import { CHARACTERS, type CharacterKey } from '@/shared/characters';

export type { CharacterKey };

interface CharacterEmptyProps {
  character: CharacterKey | 'auto';
  title: string;
  message: string;
  bullets?: string[];
  action?: { label: string; onClick?: () => void; to?: string };
}

function resolveCharacter(c: CharacterKey | 'auto'): CharacterKey {
  if (c === 'auto') return 'ankor';
  return c;
}

export function CharacterEmpty({
  character,
  title,
  message,
  bullets,
  action,
}: CharacterEmptyProps) {
  const meta = CHARACTERS[resolveCharacter(character)];

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 py-10 md:py-14 px-6">
      <div className="animate-in fade-in slide-in-from-left-6 duration-500 shrink-0">
        <div
          className={`w-40 md:w-48 aspect-square rounded-[28px] bg-gradient-to-br ${meta.accent} p-[3px] shadow-xl`}
        >
          <div className="w-full h-full rounded-[25px] bg-white overflow-hidden grid place-items-center">
            <img
              src={meta.image}
              alt={meta.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-right-6 duration-500 max-w-md relative">
        <div className="relative bg-white rounded-[24px] border border-slate-200 shadow-lg p-6 md:p-7">
          <span
            aria-hidden
            className="hidden md:block absolute -left-2 top-10 w-4 h-4 rotate-45 bg-white border-l border-b border-slate-200"
          />
          <h3 className="font-display text-xl md:text-2xl font-black text-slate-900 mb-2">
            {title}
          </h3>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">{message}</p>
          {bullets && bullets.length > 0 && (
            <ol className="mt-4 space-y-2">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br ${meta.accent} text-white text-[11px] font-black shrink-0`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{b}</span>
                </li>
              ))}
            </ol>
          )}
          {action && (
            <div className="mt-5">
              {action.to ? (
                <Button asChild>
                  <Link to={action.to}>{action.label}</Link>
                </Button>
              ) : (
                <Button onClick={action.onClick}>{action.label}</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
