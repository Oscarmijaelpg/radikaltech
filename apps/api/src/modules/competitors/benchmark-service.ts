import { prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

export interface BenchmarkFormatMix {
  [format: string]: number;
}

export interface BrandMetricsSnapshot {
  social_posts_count: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number;
  posts_per_week: number;
  format_mix: BenchmarkFormatMix;
  best_performing_platform: string | null;
  engagement_score: number;
  platforms: string[];
}

export interface BrandSnapshot extends BrandMetricsSnapshot {
  name: string;
}

export interface CompetitorSnapshot extends BrandMetricsSnapshot {
  id: string;
  name: string;
  my_vs_them: {
    engagement_ratio: number;
    frequency_ratio: number;
    verdict: 'ahead' | 'parity' | 'behind';
  };
}

export interface BenchmarkResult {
  my_brand: BrandSnapshot;
  competitors: CompetitorSnapshot[];
  overall_position: 'leader' | 'strong' | 'developing' | 'behind';
  summary: string;
}

export interface ContentGap {
  format: string;
  competitors_using: string[];
  my_usage: number;
  opportunity_score: number;
}

export interface TemporalGap {
  weekday: string;
  competitors_active: number;
  me_active: boolean;
}

export interface GapAnalysis {
  content_gaps: ContentGap[];
  temporal_gaps: TemporalGap[];
  theme_gaps: string[];
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new Forbidden('Not project owner');
  return project;
}

interface PostAggregate {
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
  formatMix: BenchmarkFormatMix;
  oldest: Date | null;
  byDay: Record<number, number>;
}

function emptyAggregate(): PostAggregate {
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

function aggregatePosts(
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
    const eng = p.likes + p.comments * 3 + p.shares * 5;
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

function snapshotFromAggregate(name: string, agg: PostAggregate): BrandSnapshot {
  const now = new Date();
  const weeksSpan = agg.oldest
    ? Math.max(1, (now.getTime() - agg.oldest.getTime()) / (7 * 86_400_000))
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

function verdict(ratio: number): 'ahead' | 'parity' | 'behind' {
  if (ratio >= 1.15) return 'ahead';
  if (ratio <= 0.85) return 'behind';
  return 'parity';
}

function computeOverall(my: BrandSnapshot, comps: CompetitorSnapshot[]): 'leader' | 'strong' | 'developing' | 'behind' {
  if (comps.length === 0) {
    if (my.social_posts_count === 0) return 'developing';
    return 'strong';
  }
  const ahead = comps.filter((c) => c.my_vs_them.verdict === 'ahead').length;
  const behind = comps.filter((c) => c.my_vs_them.verdict === 'behind').length;
  const ratio = ahead / comps.length;
  if (ratio >= 0.75) return 'leader';
  if (ratio >= 0.5) return 'strong';
  if (behind / comps.length >= 0.6) return 'behind';
  return 'developing';
}

function buildSummary(
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
    parts.push(`Tu marca lidera el benchmark con ventaja sobre ${ahead.length}/${comps.length} competidores.`);
  } else if (position === 'strong') {
    parts.push(`Tu marca tiene una posición sólida: superas a ${ahead.length}/${comps.length} competidores en engagement.`);
  } else if (position === 'developing') {
    parts.push(`Tu marca está en fase de desarrollo respecto a los competidores analizados.`);
  } else {
    parts.push(`Tu marca está por detrás de la mayoría de competidores en métricas clave.`);
  }
  if (bestComp) {
    parts.push(`${bestComp.name} lidera en engagement promedio (${Math.round(bestComp.engagement_score)} vs ${Math.round(my.engagement_score)} tuyo).`);
  }
  parts.push(`Frecuencia tuya: ${my.posts_per_week.toFixed(1)} posts/semana.`);
  return parts.join(' ');
}

function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a.map((s) => s.toLowerCase()));
  const sb = new Set(b.map((s) => s.toLowerCase()));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function extractKeywords(caption: string): string[] {
  return caption
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s#]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 40);
}

export class CompetitorBenchmarkService {
  /**
   * Compara "mi marca" vs N competidores.
   */
  async getBenchmark(projectId: string, userId: string): Promise<BenchmarkResult> {
    await assertProjectOwner(projectId, userId);

    const competitors = await prisma.competitor.findMany({
      where: { projectId, userId, status: 'confirmed' },
      orderBy: { createdAt: 'desc' },
    });

    // My brand posts: scraped for this user/project where competitorId is null
    const myPosts = await prisma.socialPost.findMany({
      where: { projectId, userId, competitorId: null },
    });

    let mySnapshot: BrandSnapshot;
    if (myPosts.length > 0) {
      mySnapshot = snapshotFromAggregate('Mi marca', aggregatePosts(myPosts));
    } else {
      // fallback: use social accounts as proxy
      const accounts = await prisma.socialAccount.findMany({
        where: { projectId, userId, isActive: true },
      });
      const platforms = accounts.map((a) => String(a.platform));
      const totalFollowers = accounts.reduce((s, a) => s + (a.followers ?? 0), 0);
      mySnapshot = {
        name: 'Mi marca',
        social_posts_count: 0,
        avg_likes: 0,
        avg_comments: 0,
        avg_views: 0,
        posts_per_week: 0,
        format_mix: {},
        best_performing_platform: platforms[0] ?? null,
        engagement_score: totalFollowers > 0 ? Math.min(totalFollowers / 1000, 100) : 0,
        platforms,
      };
    }

    const compSnapshots: CompetitorSnapshot[] = [];
    for (const c of competitors) {
      const posts = await prisma.socialPost.findMany({ where: { competitorId: c.id } });
      const base = snapshotFromAggregate(c.name, aggregatePosts(posts));
      const myEng = Math.max(mySnapshot.engagement_score, 0.0001);
      const theirEng = Math.max(base.engagement_score, 0.0001);
      const myFreq = Math.max(mySnapshot.posts_per_week, 0.0001);
      const theirFreq = Math.max(base.posts_per_week, 0.0001);
      const engagement_ratio = myEng / theirEng;
      const frequency_ratio = myFreq / theirFreq;
      // combined verdict weighted engagement > frequency
      const combined = engagement_ratio * 0.7 + frequency_ratio * 0.3;
      compSnapshots.push({
        ...base,
        id: c.id,
        my_vs_them: {
          engagement_ratio,
          frequency_ratio,
          verdict: verdict(combined),
        },
      });
    }

    const overall_position = computeOverall(mySnapshot, compSnapshots);
    const summary = buildSummary(mySnapshot, compSnapshots, overall_position);

    return {
      my_brand: mySnapshot,
      competitors: compSnapshots,
      overall_position,
      summary,
    };
  }

  /**
   * Detecta gaps de contenido, temporales y temáticos.
   */
  async getGaps(projectId: string, userId: string): Promise<GapAnalysis> {
    await assertProjectOwner(projectId, userId);

    const competitors = await prisma.competitor.findMany({
      where: { projectId, userId, status: 'confirmed' },
    });
    const compIds = competitors.map((c) => c.id);
    const idToName = new Map(competitors.map((c) => [c.id, c.name] as const));

    const myPosts = await prisma.socialPost.findMany({
      where: { projectId, userId, competitorId: null },
    });
    const compPosts = compIds.length
      ? await prisma.socialPost.findMany({ where: { competitorId: { in: compIds } } })
      : [];

    const myAgg = aggregatePosts(myPosts);

    // ------- content gaps (formats) -------
    const formatByCompetitor: Record<string, Set<string>> = {};
    const formatTotals: Record<string, number> = {};
    for (const p of compPosts) {
      const fmt = p.postType ?? 'unknown';
      const cid = p.competitorId ?? '';
      if (!formatByCompetitor[fmt]) formatByCompetitor[fmt] = new Set();
      formatByCompetitor[fmt].add(cid);
      formatTotals[fmt] = (formatTotals[fmt] ?? 0) + 1;
    }
    const totalCompPosts = compPosts.length || 1;
    const content_gaps: ContentGap[] = Object.entries(formatByCompetitor)
      .map(([format, set]) => {
        const my_usage = myAgg.formatMix[format] ?? 0;
        const my_share = myAgg.count ? my_usage / myAgg.count : 0;
        const comp_share = (formatTotals[format] ?? 0) / totalCompPosts;
        const competitors_using = Array.from(set)
          .map((id) => idToName.get(id) ?? '')
          .filter(Boolean);
        // opportunity: high comp share, low my share, many competitors using
        const diff = Math.max(0, comp_share - my_share);
        const coverage = competitors_using.length / Math.max(1, competitors.length);
        const opportunity_score = Math.min(10, Math.round((diff * 6 + coverage * 4) * 10) / 1);
        return {
          format,
          competitors_using,
          my_usage,
          opportunity_score: Math.min(10, Math.max(0, Math.round(opportunity_score))),
        };
      })
      .sort((a, b) => b.opportunity_score - a.opportunity_score);

    // ------- temporal gaps -------
    const compPostsByDay: Record<number, Set<string>> = {};
    for (const p of compPosts) {
      if (!p.postedAt) continue;
      const day = new Date(p.postedAt).getDay();
      if (!compPostsByDay[day]) compPostsByDay[day] = new Set();
      compPostsByDay[day].add(p.competitorId ?? '');
    }
    const temporal_gaps: TemporalGap[] = [];
    for (let d = 0; d < 7; d += 1) {
      const compsActive = compPostsByDay[d]?.size ?? 0;
      const meActive = (myAgg.byDay[d] ?? 0) > 0;
      if (compsActive >= 2 && !meActive) {
        temporal_gaps.push({
          weekday: DAY_NAMES[d]!,
          competitors_active: compsActive,
          me_active: meActive,
        });
      }
    }

    // ------- theme gaps (caption keyword analysis) -------
    const myKeywords = new Map<string, number>();
    for (const p of myPosts) {
      if (!p.caption) continue;
      for (const w of extractKeywords(p.caption)) {
        myKeywords.set(w, (myKeywords.get(w) ?? 0) + 1);
      }
    }
    const compKeywords = new Map<string, number>();
    for (const p of compPosts) {
      if (!p.caption) continue;
      for (const w of extractKeywords(p.caption)) {
        compKeywords.set(w, (compKeywords.get(w) ?? 0) + 1);
      }
    }
    const stopwords = new Set([
      'sobre', 'desde', 'hasta', 'entre', 'cuando', 'porque', 'también', 'nuestro', 'nuestra',
      'nuestros', 'nuestras', 'mucho', 'mucha', 'muchos', 'muchas', 'estos', 'estas', 'esta',
      'este', 'para', 'como', 'pero', 'todo', 'toda', 'todos', 'todas', 'https', 'http',
    ]);
    const theme_gaps: string[] = [];
    const sortedComp = [...compKeywords.entries()]
      .filter(([w]) => !stopwords.has(w) && !w.startsWith('http'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40);
    for (const [w, count] of sortedComp) {
      const mine = myKeywords.get(w) ?? 0;
      if (count >= 3 && mine === 0) {
        theme_gaps.push(w);
      }
      if (theme_gaps.length >= 10) break;
    }

    logger.debug({ projectId, content_gaps: content_gaps.length, theme_gaps: theme_gaps.length }, 'gap analysis');
    void jaccard; // reserved for future similarity work

    return { content_gaps: content_gaps.slice(0, 8), temporal_gaps, theme_gaps };
  }
}

export const competitorBenchmarkService = new CompetitorBenchmarkService();
