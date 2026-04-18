import {
  Badge,
  Icon,
} from '@radikal/ui';
import { fmtDate, sentimentClasses, sentimentLabel } from './helpers';
import type { NewsItemSimple } from './types';

export function LegacySourcesList({
  items,
  perItem,
}: {
  items: NewsItemSimple[];
  perItem: Record<string, string>;
}) {
  return (
    <div>
      <h3 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
        <Icon name="format_list_numbered" className="text-cyan-600 text-[22px]" />
        Fuentes ({items.length})
      </h3>
      <ol className="space-y-2 list-none pl-0">
        {items.map((it, idx) => {
          const mapped = it.url ? perItem[it.url] : undefined;
          const sentiment = mapped ?? it.sentiment;
          const n = idx + 1;
          return (
            <li
              key={`${it.url ?? idx}`}
              id={`fuente-${n}`}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 transition-colors min-w-0"
            >
              <span className="shrink-0 w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center text-xs font-bold border border-cyan-200">
                {n}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm font-semibold text-slate-900 hover:text-cyan-700 break-words line-clamp-2 block"
                >
                  {it.title ?? it.url}
                </a>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {sentiment && (
                    <Badge
                      className={`${sentimentClasses(sentiment)} border text-[10px] uppercase`}
                    >
                      {sentimentLabel(sentiment)}
                    </Badge>
                  )}
                  {it.source && (
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {it.source}
                    </span>
                  )}
                  {it.published_at && (
                    <span className="text-[11px] text-slate-400">
                      · {fmtDate(it.published_at)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
