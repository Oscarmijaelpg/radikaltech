import { prisma, Prisma } from '@radikal/db';
import type { SocialPlatform } from '@radikal/db';
import { competitorAnalyzer, instagramScraper, tiktokScraper } from '../ai-services/index.js';
import { competitorNarrativeGenerator } from '../ai-services/competitor-narrative.js';
import { logger } from '../../lib/logger.js';
import { Conflict } from '../../lib/errors.js';
import { assertCompetitorOwner, assertProjectOwner } from './guards.js';
import {
  discoverSocialLinksFromWebsite,
  extractHandle,
  type ScrapeNetwork,
} from './social-discovery.js';
import {
  computeEngagementStats,
  computeSocialStats,
  type EngagementStats,
} from './stats.js';

export interface CreateCompetitorInput {
  project_id: string;
  name: string;
  website?: string | null;
  notes?: string | null;
  social_links?: Record<string, string> | null;
}

export interface UpdateCompetitorInput {
  name?: string;
  website?: string | null;
  notes?: string | null;
  social_links?: Record<string, string> | null;
}

export type AnalysisMode = 'web' | 'social' | 'combined';
export type { ScrapeNetwork, EngagementStats };

export interface AnalyzeOptions {
  mode?: AnalysisMode;
  networks?: ScrapeNetwork[];
}

const DEFAULT_NETWORKS: ScrapeNetwork[] = ['instagram', 'tiktok'];
const POSTS_PAGE_MIN = 1;
const POSTS_PAGE_MAX = 200;
const POSTS_PAGE_DEFAULT = 50;
const ENGAGEMENT_COMMENT_WEIGHT = 3;
const ENGAGEMENT_SHARE_WEIGHT = 5;
const TOP_POSTS_LIMIT = 5;
const DAY_MS = 86_400_000;
const NARRATIVE_COOLDOWN_MS = 5 * 60 * 1000;

function dispatchNarrativeGeneration(
  competitorId: string,
  userId: string,
  projectId: string,
) {
  logger.info({ competitorId, projectId }, '[competitors.dispatchNarrative] scheduling');
  void (async () => {
    try {
      await competitorNarrativeGenerator.generate({ competitorId, userId, projectId });
    } catch (err) {
      logger.warn({ err, competitorId }, '[competitors.dispatchNarrative] failed');
    }
  })();
}

export const competitorsService = {
  async list(
    userId: string,
    projectId: string,
    status?: 'confirmed' | 'suggested' | 'rejected' | 'all',
  ) {
    await assertProjectOwner(projectId, userId);
    const where: Prisma.CompetitorWhereInput = { projectId, userId };
    const effective = status ?? 'confirmed';
    if (effective === 'all') {
      where.status = { not: 'rejected' };
    } else {
      where.status = effective;
    }
    return prisma.competitor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  async setStatus(id: string, userId: string, status: 'confirmed' | 'suggested' | 'rejected') {
    await assertCompetitorOwner(id, userId);
    return prisma.competitor.update({ where: { id }, data: { status } });
  },

  async bulkSetStatus(
    ids: string[],
    userId: string,
    status: 'confirmed' | 'suggested' | 'rejected',
  ) {
    const items = await prisma.competitor.findMany({ where: { id: { in: ids } } });
    const ownedIds = items.filter((c) => c.userId === userId).map((c) => c.id);
    if (ownedIds.length === 0) return { updated: 0 };
    const res = await prisma.competitor.updateMany({
      where: { id: { in: ownedIds } },
      data: { status },
    });
    return { updated: res.count };
  },

  async getById(id: string, userId: string) {
    return assertCompetitorOwner(id, userId);
  },

  async create(userId: string, input: CreateCompetitorInput) {
    await assertProjectOwner(input.project_id, userId);
    return prisma.competitor.create({
      data: {
        projectId: input.project_id,
        userId,
        name: input.name,
        website: input.website ?? null,
        notes: input.notes ?? null,
        socialLinks: (input.social_links ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  },

  async update(id: string, userId: string, input: UpdateCompetitorInput) {
    await assertCompetitorOwner(id, userId);
    const data: Prisma.CompetitorUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.website !== undefined) data.website = input.website;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.social_links !== undefined) {
      data.socialLinks = (input.social_links ?? undefined) as Prisma.InputJsonValue | undefined;
    }
    return prisma.competitor.update({ where: { id }, data });
  },

  async remove(id: string, userId: string) {
    await assertCompetitorOwner(id, userId);
    await prisma.competitor.delete({ where: { id } });
    return { deleted: true };
  },

  async analyze(id: string, userId: string, options: AnalyzeOptions = {}) {
    const competitor = await assertCompetitorOwner(id, userId);
    const mode: AnalysisMode = options.mode ?? 'combined';
    const networks: ScrapeNetwork[] = options.networks ?? DEFAULT_NETWORKS;

    logger.info(
      { competitorId: id, name: competitor.name, mode, networks },
      '[competitors.analyze] START',
    );

    const project = await prisma.project.findUnique({ where: { id: competitor.projectId } });
    let socialLinks = (competitor.socialLinks ?? {}) as Record<string, string>;

    // Auto-descubre redes en website si faltan handles de IG/TikTok (modo social/combined).
    const needsDiscovery =
      (mode === 'social' || mode === 'combined') &&
      competitor.website &&
      !extractHandle('instagram', socialLinks) &&
      !extractHandle('tiktok', socialLinks);

    if (needsDiscovery) {
      try {
        const discovered = await discoverSocialLinksFromWebsite(competitor.website!);
        if (Object.keys(discovered).length > 0) {
          socialLinks = { ...socialLinks, ...discovered };
          await prisma.competitor.update({
            where: { id: competitor.id },
            data: { socialLinks: socialLinks as unknown as Prisma.InputJsonValue },
          });
          logger.info({ competitorId: id, discovered }, 'social links discovered from website');
        }
      } catch (err) {
        logger.warn({ err, competitorId: id }, 'social links discovery failed');
      }
    }

    let webResult: unknown = competitor.analysisData ?? null;

    if (mode === 'web' || mode === 'combined') {
      const industry = project?.industry ? ` ${project.industry}` : '';
      const query = `${competitor.name}${industry}`.trim();
      const { result } = await competitorAnalyzer.analyze({
        query,
        userId,
        projectId: competitor.projectId,
      });
      webResult = result;
    }

    const currentSyncStatus: Record<string, {
      synced_at: string;
      post_count: number;
      handle?: string;
    }> =
      (competitor.syncStatus as Record<
        string,
        { synced_at: string; post_count: number; handle?: string }
      > | null) ?? {};
    const newSyncStatus = { ...currentSyncStatus };

    if (mode === 'social' || mode === 'combined') {
      const scrapeJobs: Promise<{
        platform: ScrapeNetwork;
        count: number;
        handle: string;
      } | null>[] = [];
      for (const net of networks) {
        const handle = extractHandle(net, socialLinks);
        if (!handle) continue;
        if (net === 'instagram') {
          scrapeJobs.push(
            instagramScraper
              .scrape({
                handle,
                userId,
                projectId: competitor.projectId,
                competitorId: competitor.id,
              })
              .then((r) => ({ platform: 'instagram' as const, count: r.posts.length, handle }))
              .catch((err) => {
                logger.warn({ err, handle }, 'instagram scrape failed in analyze');
                return null;
              }),
          );
        } else if (net === 'tiktok') {
          scrapeJobs.push(
            tiktokScraper
              .scrape({
                handle,
                userId,
                projectId: competitor.projectId,
                competitorId: competitor.id,
              })
              .then((r) => ({ platform: 'tiktok' as const, count: r.posts.length, handle }))
              .catch((err) => {
                logger.warn({ err, handle }, 'tiktok scrape failed in analyze');
                return null;
              }),
          );
        }
      }
      const results = await Promise.all(scrapeJobs);
      const now = new Date().toISOString();
      for (const r of results) {
        if (!r) continue;
        newSyncStatus[r.platform] = {
          synced_at: now,
          post_count: r.count,
          handle: r.handle,
        };
      }
      logger.info(
        {
          competitorId: id,
          scrapesAttempted: scrapeJobs.length,
          scrapesSucceeded: results.filter(Boolean).length,
          perPlatform: results.filter(Boolean),
        },
        '[competitors.analyze] scrapes done',
      );
    }

    const socialStats = await computeSocialStats(competitor.id);
    logger.info({ competitorId: id, socialStats }, '[competitors.analyze] socialStats computed');

    const combinedAnalysisData = {
      ...(webResult && typeof webResult === 'object' ? (webResult as object) : {}),
      social_stats: socialStats,
    };

    let engagementStats: EngagementStats | null = null;
    if (mode === 'social' || mode === 'combined') {
      engagementStats = await computeEngagementStats(competitor.id);
    }

    const updated = await prisma.competitor.update({
      where: { id },
      data: {
        analysisData: combinedAnalysisData as unknown as Prisma.InputJsonValue,
        lastAnalyzedAt: new Date(),
        syncStatus: newSyncStatus as unknown as Prisma.InputJsonValue,
        ...(engagementStats
          ? { engagementStats: engagementStats as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });

    logger.info(
      {
        competitorId: id,
        totalPosts: engagementStats?.total_posts ?? 0,
        avgEngagement: engagementStats?.avg_engagement ?? 0,
      },
      '[competitors.analyze] DONE — dispatching narrative',
    );

    dispatchNarrativeGeneration(updated.id, userId, updated.projectId);

    return {
      competitor: updated,
      result: webResult,
      sync_status: newSyncStatus,
      social_stats: socialStats,
      engagement_stats: engagementStats,
    };
  },

  async syncSocial(id: string, userId: string, networks?: ScrapeNetwork[]) {
    await assertCompetitorOwner(id, userId);
    logger.info({ competitorId: id, networks }, '[competitors.syncSocial] scheduled');
    void (async () => {
      try {
        await competitorsService.analyze(id, userId, { mode: 'social', networks });
        logger.info({ competitorId: id }, '[competitors.syncSocial] DONE');
      } catch (err) {
        logger.warn({ err, id }, '[competitors.syncSocial] FAILED');
      }
    })();
    return { scheduled: true };
  },

  async analyzeAsync(id: string, userId: string, options: AnalyzeOptions = {}) {
    await assertCompetitorOwner(id, userId);
    logger.info({ competitorId: id, options }, '[competitors.analyzeAsync] scheduled');
    void (async () => {
      try {
        await competitorsService.analyze(id, userId, options);
        logger.info({ competitorId: id }, '[competitors.analyzeAsync] DONE');
      } catch (err) {
        logger.warn({ err, id }, '[competitors.analyzeAsync] FAILED');
      }
    })();
    return { scheduled: true };
  },

  async regenerateNarrative(id: string, userId: string) {
    const owned = await assertCompetitorOwner(id, userId);
    const last = owned.narrativeGeneratedAt;
    logger.info(
      {
        competitorId: id,
        lastGeneratedAt: last?.toISOString() ?? null,
        cooldownMs: NARRATIVE_COOLDOWN_MS,
      },
      '[competitors.regenerateNarrative] request',
    );
    if (last && Date.now() - last.getTime() < NARRATIVE_COOLDOWN_MS) {
      const wait = Math.ceil(
        (NARRATIVE_COOLDOWN_MS - (Date.now() - last.getTime())) / 1000,
      );
      logger.info({ competitorId: id, waitSec: wait }, '[competitors.regenerateNarrative] cooldown hit');
      throw new Conflict(`Espera ${wait}s antes de regenerar la interpretación.`);
    }
    dispatchNarrativeGeneration(id, userId, owned.projectId);
    return { scheduled: true };
  },

  async computeAndStoreEngagementStats(
    competitorId: string,
    userId: string,
  ): Promise<EngagementStats> {
    await assertCompetitorOwner(competitorId, userId);
    const stats = await computeEngagementStats(competitorId);
    await prisma.competitor.update({
      where: { id: competitorId },
      data: { engagementStats: stats as unknown as Prisma.InputJsonValue },
    });
    return stats;
  },

  async getPosts(
    competitorId: string,
    userId: string,
    filters: { platform?: string; limit?: number } = {},
  ) {
    await assertCompetitorOwner(competitorId, userId);
    const where: Prisma.SocialPostWhereInput = { competitorId };
    if (filters.platform) where.platform = filters.platform as SocialPlatform;
    const limit = Math.min(
      Math.max(filters.limit ?? POSTS_PAGE_DEFAULT, POSTS_PAGE_MIN),
      POSTS_PAGE_MAX,
    );
    return prisma.socialPost.findMany({
      where,
      orderBy: { postedAt: 'desc' },
      take: limit,
    });
  },

  async getStats(competitorId: string, userId: string) {
    const competitor = await assertCompetitorOwner(competitorId, userId);
    const posts = await prisma.socialPost.findMany({
      where: { competitorId },
      orderBy: { postedAt: 'desc' },
    });

    const by_platform: Record<
      string,
      { count: number; likes: number; comments: number; views: number; engagement: number }
    > = {};
    const format_mix: Record<string, number> = {};
    const weeks: Record<string, number> = {};
    let total_engagement = 0;
    let total_likes = 0;
    let total_comments = 0;

    for (const p of posts) {
      const eng =
        p.likes + p.comments * ENGAGEMENT_COMMENT_WEIGHT + p.shares * ENGAGEMENT_SHARE_WEIGHT;
      total_engagement += eng;
      total_likes += p.likes;
      total_comments += p.comments;
      const plat = String(p.platform);
      if (!by_platform[plat])
        by_platform[plat] = { count: 0, likes: 0, comments: 0, views: 0, engagement: 0 };
      by_platform[plat].count += 1;
      by_platform[plat].likes += p.likes;
      by_platform[plat].comments += p.comments;
      by_platform[plat].views += p.views;
      by_platform[plat].engagement += eng;

      const fmt = p.postType ?? 'unknown';
      format_mix[fmt] = (format_mix[fmt] ?? 0) + 1;

      if (p.postedAt) {
        const d = new Date(p.postedAt);
        const onejan = new Date(d.getFullYear(), 0, 1).getTime();
        const week = Math.ceil(
          ((d.getTime() - onejan) / DAY_MS + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7,
        );
        const key = `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
        weeks[key] = (weeks[key] ?? 0) + 1;
      }
    }

    const top_posts = [...posts]
      .sort(
        (a, b) =>
          b.likes + b.comments * ENGAGEMENT_COMMENT_WEIGHT -
          (a.likes + a.comments * ENGAGEMENT_COMMENT_WEIGHT),
      )
      .slice(0, TOP_POSTS_LIMIT)
      .map((p) => ({
        id: p.id,
        post_url: p.postUrl,
        caption: p.caption,
        likes: p.likes,
        comments: p.comments,
        views: p.views,
        platform: String(p.platform),
        image_url: p.imageUrl,
        posted_at: p.postedAt,
      }));

    const posts_by_week = Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    return {
      competitor_id: competitorId,
      competitor_name: competitor.name,
      total_posts: posts.length,
      total_likes,
      total_comments,
      avg_engagement: posts.length ? total_engagement / posts.length : 0,
      by_platform,
      format_mix,
      top_posts,
      posts_by_week,
      engagement_stats: (competitor.engagementStats as unknown as EngagementStats | null) ?? null,
    };
  },
};
