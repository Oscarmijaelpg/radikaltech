import { useMemo } from 'react';
import type { SocialPostItem, VisualAnalysisPayload } from '../../api/memory';

const TOP_COLORS = 10;
const TOP_TAGS = 15;
const MAX_DESCRIPTIONS = 5;

export interface AestheticAggregation {
  topColors: string[];
  topTags: { tag: string; count: number }[];
  descriptions: string[];
  total: number;
}

export function useAesthetic(posts: SocialPostItem[] | undefined): AestheticAggregation | null {
  return useMemo(() => {
    const withVa = (posts ?? []).filter(
      (p): p is SocialPostItem & { visual_analysis: VisualAnalysisPayload } =>
        Boolean(p.visual_analysis),
    );
    if (withVa.length === 0) return null;
    const colorCount: Record<string, number> = {};
    const tagCount: Record<string, number> = {};
    const descriptions: string[] = [];
    for (const p of withVa) {
      const va = p.visual_analysis;
      for (const c of va.dominant_colors ?? []) {
        const key = c.toUpperCase();
        colorCount[key] = (colorCount[key] ?? 0) + 1;
      }
      for (const t of va.style_tags ?? []) {
        const key = t.toLowerCase();
        tagCount[key] = (tagCount[key] ?? 0) + 1;
      }
      if (va.description) descriptions.push(va.description);
    }
    const topColors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_COLORS)
      .map(([c]) => c);
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_TAGS)
      .map(([t, n]) => ({ tag: t, count: n }));
    return {
      topColors,
      topTags,
      descriptions: descriptions.slice(0, MAX_DESCRIPTIONS),
      total: withVa.length,
    };
  }, [posts]);
}
