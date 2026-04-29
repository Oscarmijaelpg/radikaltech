import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, Skeleton } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import type { SavedReport } from '../api/news';

function relativeDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return formatDistanceToNow(d, { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

interface Props {
  activeProjectId: string | undefined;
  saved: SavedReport[];
  isLoading: boolean;
  currentTopic: string | null;
  onSelect: (r: SavedReport) => void;
}

export function SavedSearchesSidebar({
  activeProjectId,
  saved,
  isLoading,
  currentTopic,
  onSelect,
}: Props) {
  return (
    <Card className="p-5 sticky top-4">
      <h3 className="font-display text-sm font-black uppercase tracking-tight mb-3 text-slate-700">
        Búsquedas guardadas
      </h3>
      {!activeProjectId ? (
        <p className="text-xs text-slate-500">
          Selecciona un proyecto para guardar búsquedas.
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : saved.length === 0 ? (
        <p className="text-xs text-slate-500">
          Tus búsquedas aparecerán aquí después de tu primer rastreo.
        </p>
      ) : (
        <ul className="space-y-1">
          {saved.map((r) => {
            const label = r.title.replace(/^Noticias:\s*/i, '');
            return (
              <li key={r.id}>
                <button
                  onClick={() => onSelect(r)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-50 transition-colors',
                    currentTopic &&
                      label.toLowerCase() === currentTopic.toLowerCase() &&
                      'bg-cyan-50 border border-cyan-200',
                  )}
                >
                  <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {relativeDate(r.createdAt)}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
