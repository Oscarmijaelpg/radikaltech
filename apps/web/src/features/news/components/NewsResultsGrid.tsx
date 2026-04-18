import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge, Card } from '@radikal/ui';
import type { NewsItem } from '../api/news';

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
  items: NewsItem[];
  currentTopic: string | null;
  onAskSira: (item: NewsItem) => void;
}

export function NewsResultsGrid({ items, currentTopic, onAskSira }: Props) {
  return (
    <>
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-display text-xl font-bold">
          Resultados{' '}
          <span className="text-sm text-slate-500 font-normal">
            ({items.length} noticias)
          </span>
        </h2>
        {currentTopic && (
          <Badge className="bg-cyan-100 text-cyan-700 border border-cyan-200">
            {currentTopic}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {items.map((it, idx) => (
          <Card
            key={`${it.url}-${idx}`}
            className="p-5 flex flex-col gap-3 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              {it.source && (
                <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] uppercase">
                  {it.source}
                </Badge>
              )}
              {it.published_at && (
                <span className="text-[11px] text-slate-500">
                  {relativeDate(it.published_at)}
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-slate-900 leading-snug line-clamp-3">
              {it.title}
            </h3>
            {it.summary && (
              <p className="text-sm text-slate-600 line-clamp-4">{it.summary}</p>
            )}
            <div className="mt-auto flex items-center justify-between gap-2">
              <a
                href={it.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
              >
                Leer más
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
              <button
                type="button"
                onClick={() => onAskSira(it)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-cyan-700 px-3 py-2 rounded-lg hover:bg-cyan-50 transition-colors min-h-[44px]"
                aria-label="Preguntar a Sira"
              >
                <span className="material-symbols-outlined text-[14px]">forum</span>
                Preguntar a Sira
              </button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
