import { computeAuthority, hostnameOf } from './authority.js';
import { clusterItems } from './clustering.js';
import type { EnrichedNewsItem, NewsItem } from './types.js';

const DEFAULT_RELEVANCE_SCORE = 50;

export function enrichItems(
  items: NewsItem[],
  perItemSentiment: Record<string, 'positive' | 'neutral' | 'negative'>,
  perItemRelevance: Record<string, { score: number; reason: string }>,
): EnrichedNewsItem[] {
  const clusters = clusterItems(items);
  return items.map((it, idx) => {
    const host = it.source ?? (it.url ? hostnameOf(it.url) : undefined);
    const rel = it.url ? perItemRelevance[it.url] : undefined;
    const sent = (it.url ? perItemSentiment[it.url] : undefined) ?? 'neutral';
    return {
      original_index: idx,
      title: it.title ?? '',
      url: it.url,
      source: it.source,
      source_authority: computeAuthority(host),
      relevance_score: rel?.score ?? DEFAULT_RELEVANCE_SCORE,
      relevance_reason: rel?.reason ?? '',
      cluster_id: clusters[idx]?.clusterId,
      cluster_size: clusters[idx]?.size ?? 1,
      sentiment: sent,
    };
  });
}
