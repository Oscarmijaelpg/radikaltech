import type { BrandSnapshot, CompetitorSnapshot, BenchmarkResult } from './benchmark-service.js';

export const DAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const WEEK_MS = 7 * 86_400_000;
const ENGAGEMENT_COMMENT_WEIGHT = 3;
const ENGAGEMENT_SHARE_WEIGHT = 5;
const VERDICT_AHEAD_THRESHOLD = 1.15;
const VERDICT_BEHIND_THRESHOLD = 0.85;
const LEADER_RATIO = 0.75;
const STRONG_RATIO = 0.5;
const BEHIND_RATIO = 0.6;
const ENGAGEMENT_WEIGHT = 0.7;
const FREQUENCY_WEIGHT = 0.3;
const MIN_KEYWORD_LEN = 4;
const MAX_KEYWORDS_PER_CAPTION = 40;

export interface PostAggregate {
  count: number;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  engagement: number;
  byPlatform: Record<
    string,
    { count: number; likes: number; comments: number; views: number; engagement: number }
  >;
  formatMix: Record<string, number>;
  oldest: Date | null;
  byDay: Record<number, number>;
}

export function emptyAggregate(): PostAggregate {
  return {
    count: 0,
    likes: 0,
    comments: 0,
    views: 0,
    shares: 0,
    engagement: 0,
    byPlatform: {},
    formatMix: {},
    oldest: null,
    byDay: {},
  };
}

export function aggregatePosts(
  posts: Array<{
    likes: number;
    comments: number;
    views: number;
    shares: number;
    postType: string | null;
    platform: unknown;
    postedAt: Date | null;
  }>,
): PostAggregate {
  const agg = emptyAggregate();
  for (const p of posts) {
    const eng = p.likes + p.comments * ENGAGEMENT_COMMENT_WEIGHT + p.shares * ENGAGEMENT_SHARE_WEIGHT;
    agg.count += 1;
    agg.likes += p.likes;
    agg.comments += p.comments;
    agg.views += p.views;
    agg.shares += p.shares;
    agg.engagement += eng;

    const plat = String(p.platform);
    if (!agg.byPlatform[plat]) {
      agg.byPlatform[plat] = { count: 0, likes: 0, comments: 0, views: 0, engagement: 0 };
    }
    agg.byPlatform[plat].count += 1;
    agg.byPlatform[plat].likes += p.likes;
    agg.byPlatform[plat].comments += p.comments;
    agg.byPlatform[plat].views += p.views;
    agg.byPlatform[plat].engagement += eng;

    const fmt = p.postType ?? 'unknown';
    agg.formatMix[fmt] = (agg.formatMix[fmt] ?? 0) + 1;

    if (p.postedAt) {
      const d = new Date(p.postedAt);
      if (!agg.oldest || d < agg.oldest) agg.oldest = d;
      const day = d.getDay();
      agg.byDay[day] = (agg.byDay[day] ?? 0) + 1;
    }
  }
  return agg;
}

function bestPlatform(agg: PostAggregate): string | null {
  let best: string | null = null;
  let bestEng = -1;
  for (const [k, v] of Object.entries(agg.byPlatform)) {
    const avg = v.count ? v.engagement / v.count : 0;
    if (avg > bestEng) {
      bestEng = avg;
      best = k;
    }
  }
  return best;
}

export function snapshotFromAggregate(name: string, agg: PostAggregate): BrandSnapshot {
  const now = new Date();
  const weeksSpan = agg.oldest
    ? Math.max(1, (now.getTime() - agg.oldest.getTime()) / WEEK_MS)
    : 1;
  const n = agg.count;
  const avgEng = n ? agg.engagement / n : 0;
  return {
    name,
    social_posts_count: n,
    avg_likes: n ? agg.likes / n : 0,
    avg_comments: n ? agg.comments / n : 0,
    avg_views: n ? agg.views / n : 0,
    posts_per_week: n / weeksSpan,
    format_mix: agg.formatMix,
    best_performing_platform: bestPlatform(agg),
    engagement_score: avgEng,
    platforms: Object.keys(agg.byPlatform),
  };
}

export function verdict(ratio: number): 'ahead' | 'parity' | 'behind' {
  if (ratio >= VERDICT_AHEAD_THRESHOLD) return 'ahead';
  if (ratio <= VERDICT_BEHIND_THRESHOLD) return 'behind';
  return 'parity';
}

export function combinedRatio(
  mySnapshot: BrandSnapshot,
  competitor: BrandSnapshot,
): { engagement_ratio: number; frequency_ratio: number; combined: number } {
  const EPS = 0.0001;
  const engagement_ratio =
    Math.max(mySnapshot.engagement_score, EPS) / Math.max(competitor.engagement_score, EPS);
  const frequency_ratio =
    Math.max(mySnapshot.posts_per_week, EPS) / Math.max(competitor.posts_per_week, EPS);
  const combined = engagement_ratio * ENGAGEMENT_WEIGHT + frequency_ratio * FREQUENCY_WEIGHT;
  return { engagement_ratio, frequency_ratio, combined };
}

export function computeOverall(
  my: BrandSnapshot,
  comps: CompetitorSnapshot[],
): 'leader' | 'strong' | 'developing' | 'behind' {
  if (comps.length === 0) {
    if (my.social_posts_count === 0) return 'developing';
    return 'strong';
  }
  const ahead = comps.filter((c) => c.my_vs_them.verdict === 'ahead').length;
  const behind = comps.filter((c) => c.my_vs_them.verdict === 'behind').length;
  const ratio = ahead / comps.length;
  if (ratio >= LEADER_RATIO) return 'leader';
  if (ratio >= STRONG_RATIO) return 'strong';
  if (behind / comps.length >= BEHIND_RATIO) return 'behind';
  return 'developing';
}

export function buildSummary(
  my: BrandSnapshot,
  comps: CompetitorSnapshot[],
  position: BenchmarkResult['overall_position'],
): string {
  if (comps.length === 0) {
    return `Aún no hay competidores analizados suficientes para un benchmark completo. Tu marca ha publicado ${my.social_posts_count} posts con un engagement promedio de ${Math.round(my.engagement_score)}.`;
  }
  const bestComp = [...comps].sort((a, b) => b.engagement_score - a.engagement_score)[0];
  const ahead = comps.filter((c) => c.my_vs_them.verdict === 'ahead').map((c) => c.name);
  const parts: string[] = [];
  if (position === 'leader') {
    parts.push(
      `Tu marca lidera el benchmark con ventaja sobre ${ahead.length}/${comps.length} competidores.`,
    );
  } else if (position === 'strong') {
    parts.push(
      `Tu marca tiene una posición sólida: superas a ${ahead.length}/${comps.length} competidores en engagement.`,
    );
  } else if (position === 'developing') {
    parts.push(`Tu marca está en fase de desarrollo respecto a los competidores analizados.`);
  } else {
    parts.push(`Tu marca está por detrás de la mayoría de competidores en métricas clave.`);
  }
  if (bestComp) {
    if (bestComp.engagement_score > my.engagement_score) {
      parts.push(
        `${bestComp.name} lidera en engagement promedio (${Math.round(bestComp.engagement_score)} vs ${Math.round(my.engagement_score)} tuyo).`,
      );
    } else if (my.engagement_score > 0 && bestComp.engagement_score > 0) {
      parts.push(
        `Tú superas al competidor más cercano (${bestComp.name}) en engagement promedio (${Math.round(my.engagement_score)} vs ${Math.round(bestComp.engagement_score)}).`,
      );
    }
  }
  parts.push(`Frecuencia tuya: ${my.posts_per_week.toFixed(1)} posts/semana.`);
  return parts.join(' ');
}

export function extractKeywords(caption: string): string[] {
  return caption
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s#]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > MIN_KEYWORD_LEN)
    .slice(0, MAX_KEYWORDS_PER_CAPTION);
}

export const BENCHMARK_STOPWORDS = new Set([
  'sobre',
  'desde',
  'hasta',
  'entre',
  'cuando',
  'porque',
  'también',
  'nuestro',
  'nuestra',
  'nuestros',
  'nuestras',
  'mucho',
  'mucha',
  'muchos',
  'muchas',
  'estos',
  'estas',
  'esta',
  'este',
  'para',
  'como',
  'pero',
  'todo',
  'toda',
  'todos',
  'todas',
  'https',
  'http',
]);
