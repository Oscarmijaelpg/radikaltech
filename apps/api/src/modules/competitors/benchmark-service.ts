import { prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';
import {
  BENCHMARK_STOPWORDS,
  DAY_NAMES,
  aggregatePosts,
  buildSummary,
  combinedRatio,
  computeOverall,
  extractKeywords,
  snapshotFromAggregate,
  verdict,
} from './benchmark-helpers.js';
import { assertProjectOwner } from './guards.js';

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

const FOLLOWERS_PER_SCORE_POINT = 1000;
const MAX_ENGAGEMENT_SCORE_FALLBACK = 100;
const MIN_COMP_ACTIVE_FOR_GAP = 2;
const MIN_COMP_KEYWORD_FREQ = 3;
const MAX_THEME_GAPS = 10;
const MAX_CONTENT_GAPS = 8;
const TOP_COMP_KEYWORDS = 40;

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

    // Mi marca: posts scrapeados del user/project sin competitorId.
    const myPosts = await prisma.socialPost.findMany({
      where: { projectId, userId, competitorId: null },
    });

    let mySnapshot: BrandSnapshot;
    if (myPosts.length > 0) {
      mySnapshot = snapshotFromAggregate('Mi marca', aggregatePosts(myPosts));
    } else {
      // Fallback: social accounts como proxy cuando aún no hay scraping.
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
        engagement_score:
          totalFollowers > 0
            ? Math.min(totalFollowers / FOLLOWERS_PER_SCORE_POINT, MAX_ENGAGEMENT_SCORE_FALLBACK)
            : 0,
        platforms,
      };
    }

    const compSnapshots: CompetitorSnapshot[] = [];
    for (const c of competitors) {
      const posts = await prisma.socialPost.findMany({ where: { competitorId: c.id } });
      const base = snapshotFromAggregate(c.name, aggregatePosts(posts));
      const { engagement_ratio, frequency_ratio, combined } = combinedRatio(mySnapshot, base);
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
      if (compsActive >= MIN_COMP_ACTIVE_FOR_GAP && !meActive) {
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
    const theme_gaps: string[] = [];
    const sortedComp = [...compKeywords.entries()]
      .filter(([w]) => !BENCHMARK_STOPWORDS.has(w) && !w.startsWith('http'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_COMP_KEYWORDS);
    for (const [w, count] of sortedComp) {
      const mine = myKeywords.get(w) ?? 0;
      if (count >= MIN_COMP_KEYWORD_FREQ && mine === 0) {
        theme_gaps.push(w);
      }
      if (theme_gaps.length >= MAX_THEME_GAPS) break;
    }

    logger.debug(
      { projectId, content_gaps: content_gaps.length, theme_gaps: theme_gaps.length },
      'gap analysis',
    );

    return {
      content_gaps: content_gaps.slice(0, MAX_CONTENT_GAPS),
      temporal_gaps,
      theme_gaps,
    };
  }
}

export const competitorBenchmarkService = new CompetitorBenchmarkService();
