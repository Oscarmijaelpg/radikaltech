import { useMemo } from 'react';
import type { NewsItemSimple } from './types';

export function NarrativeWithCitations({
  narrative,
  items,
}: {
  narrative: string;
  items: NewsItemSimple[];
}) {
  const parts = useMemo(() => {
    const out: Array<{ type: 'text'; content: string } | { type: 'cite'; n: number }> = [];
    const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(narrative)) !== null) {
      if (m.index > lastIdx) {
        out.push({ type: 'text', content: narrative.slice(lastIdx, m.index) });
      }
      const nums = m[1]!.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      for (const n of nums) {
        out.push({ type: 'cite', n });
      }
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < narrative.length) {
      out.push({ type: 'text', content: narrative.slice(lastIdx) });
    }
    return out;
  }, [narrative]);

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.content}</span>;
        const item = items[p.n - 1];
        return (
          <a
            key={i}
            href={item?.url ?? `#fuente-${p.n}`}
            onClick={(e) => {
              if (!item?.url) {
                e.preventDefault();
                document
                  .getElementById(`fuente-${p.n}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            target={item?.url ? '_blank' : undefined}
            rel={item?.url ? 'noreferrer noopener' : undefined}
            title={item?.title ?? `Fuente ${p.n}`}
            className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 mx-0.5 text-[10px] font-bold rounded-md bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 transition-colors align-super no-underline"
          >
            {p.n}
          </a>
        );
      })}
    </div>
  );
}
