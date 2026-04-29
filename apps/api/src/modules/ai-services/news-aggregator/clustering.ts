import type { NewsItem } from './types.js';

const MIN_TOKEN_LEN = 3;
const CLUSTER_SIMILARITY_THRESHOLD = 0.6;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'are',
  'was', 'were', 'but', 'not', 'you', 'your', 'their', 'them', 'about',
  'over', 'into', 'after', 'before', 'de', 'la', 'el', 'los', 'las', 'un',
  'una', 'unos', 'unas', 'por', 'para', 'con', 'sin', 'que', 'como', 'y',
  'o', 'en', 'a', 'al', 'del', 'es', 'son', 'fue', 'ser', 'se', 'lo',
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > MIN_TOKEN_LEN && !STOPWORDS.has(w)),
  );
}

function jaccardSim(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function clusterItems(items: NewsItem[]): Array<{ clusterId: string; size: number }> {
  const tokens = items.map((it) => tokenize(it.title ?? ''));
  const assignments: number[] = new Array(items.length).fill(-1);
  const clusterIds: string[] = [];
  let next = 0;
  for (let i = 0; i < items.length; i += 1) {
    if (assignments[i] !== -1) continue;
    const id = `cluster-${++next}`;
    clusterIds.push(id);
    assignments[i] = clusterIds.length - 1;
    for (let j = i + 1; j < items.length; j += 1) {
      if (assignments[j] !== -1) continue;
      const sim = jaccardSim(tokens[i]!, tokens[j]!);
      if (sim > CLUSTER_SIMILARITY_THRESHOLD) assignments[j] = clusterIds.length - 1;
    }
  }
  const sizes: Record<number, number> = {};
  for (const a of assignments) sizes[a] = (sizes[a] ?? 0) + 1;
  return assignments.map((idx) => ({
    clusterId: clusterIds[idx]!,
    size: sizes[idx] ?? 1,
  }));
}
