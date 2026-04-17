import { prisma, Prisma } from '@radikal/db';
import type { SocialPlatform } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';
import {
  competitorAnalyzer,
  instagramScraper,
  tiktokScraper,
  parseInstagramHandle,
  parseTikTokHandle,
} from '../ai-services/index.js';
import { logger } from '../../lib/logger.js';

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
export type ScrapeNetwork = 'instagram' | 'tiktok';

export interface EngagementStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  total_shares: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number;
  avg_engagement: number;
  posts_per_week: number;
  top_post_ids: string[];
  best_hour: number | null;
  best_day: string | null;
  by_platform: Record<string, { count: number; likes: number; comments: number; views: number; shares: number }>;
  updated_at: string;
}

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

async function computeEngagementStatsInternal(competitorId: string): Promise<EngagementStats> {
  const posts = await prisma.socialPost.findMany({ where: { competitorId } });
  const now = new Date();
  let total_likes = 0;
  let total_comments = 0;
  let total_views = 0;
  let total_shares = 0;
  let total_engagement = 0;
  const by_platform: EngagementStats['by_platform'] = {};
  const byDay: Record<number, { count: number; engagement: number }> = {};
  const byHour: Record<number, { count: number; engagement: number }> = {};
  let oldest: Date | null = null;

  for (const p of posts) {
    const eng = p.likes + p.comments * 3 + p.shares * 5;
    total_likes += p.likes;
    total_comments += p.comments;
    total_views += p.views;
    total_shares += p.shares;
    total_engagement += eng;
    const k = String(p.platform);
    if (!by_platform[k]) by_platform[k] = { count: 0, likes: 0, comments: 0, views: 0, shares: 0 };
    by_platform[k].count += 1;
    by_platform[k].likes += p.likes;
    by_platform[k].comments += p.comments;
    by_platform[k].views += p.views;
    by_platform[k].shares += p.shares;
    if (p.postedAt) {
      const d = new Date(p.postedAt);
      if (!oldest || d < oldest) oldest = d;
      const day = d.getDay();
      const hour = d.getHours();
      byDay[day] = byDay[day] ?? { count: 0, engagement: 0 };
      byDay[day].count += 1;
      byDay[day].engagement += eng;
      byHour[hour] = byHour[hour] ?? { count: 0, engagement: 0 };
      byHour[hour].count += 1;
      byHour[hour].engagement += eng;
    }
  }

  const n = posts.length;
  const weeksSpan = oldest ? Math.max(1, (now.getTime() - oldest.getTime()) / (7 * 86400000)) : 1;
  const top_post_ids = [...posts]
    .sort((a, b) => b.likes + b.comments * 3 + b.shares * 5 - (a.likes + a.comments * 3 + a.shares * 5))
    .slice(0, 5)
    .map((p) => p.id);

  let best_day: string | null = null;
  let best_day_avg = -1;
  for (const [k, v] of Object.entries(byDay)) {
    const avg = v.engagement / Math.max(1, v.count);
    if (avg > best_day_avg) {
      best_day_avg = avg;
      best_day = DAY_NAMES[Number(k)] ?? null;
    }
  }
  let best_hour: number | null = null;
  let best_hour_avg = -1;
  for (const [k, v] of Object.entries(byHour)) {
    const avg = v.engagement / Math.max(1, v.count);
    if (avg > best_hour_avg) {
      best_hour_avg = avg;
      best_hour = Number(k);
    }
  }

  return {
    total_posts: n,
    total_likes,
    total_comments,
    total_views,
    total_shares,
    avg_likes: n ? total_likes / n : 0,
    avg_comments: n ? total_comments / n : 0,
    avg_views: n ? total_views / n : 0,
    avg_engagement: n ? total_engagement / n : 0,
    posts_per_week: n / weeksSpan,
    top_post_ids,
    best_hour,
    best_day,
    by_platform,
    updated_at: now.toISOString(),
  };
}

export interface AnalyzeOptions {
  mode?: AnalysisMode;
  networks?: ScrapeNetwork[];
}

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== userId) throw new Forbidden('Not project owner');
  return project;
}

async function assertCompetitorOwner(id: string, userId: string) {
  const c = await prisma.competitor.findUnique({ where: { id } });
  if (!c) throw new NotFound('Competitor not found');
  if (c.userId !== userId) throw new Forbidden();
  return c;
}

function extractHandle(network: ScrapeNetwork, socialLinks: Record<string, string> | null | undefined): string | null {
  if (!socialLinks) return null;
  const raw = socialLinks[network];
  if (!raw) return null;
  return network === 'instagram' ? parseInstagramHandle(raw) : parseTikTokHandle(raw);
}

/** Busca links a Instagram/TikTok/FB/LinkedIn/X en el HTML de la home del competidor. */
async function discoverSocialLinksFromWebsite(
  websiteUrl: string,
): Promise<Record<string, string>> {
  const { env } = await import('../../config/env.js');
  if (!env.FIRECRAWL_API_KEY) return {};

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: websiteUrl,
        formats: ['html'],
        onlyMainContent: false,
        timeout: 20_000,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return {};
    const body = (await res.json()) as { data?: { html?: string } };
    const html = body.data?.html ?? '';
    if (!html) return {};

    const links: Record<string, string> = {};
    const patterns: Array<[string, RegExp]> = [
      ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)(?:\/|\?|")/i],
      ['tiktok', /https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]+)(?:\/|\?|")/i],
      ['facebook', /https?:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9.\-_]+)(?:\/|\?|")/i],
      ['linkedin', /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([A-Za-z0-9\-_]+)(?:\/|\?|")/i],
      ['x', /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]+)(?:\/|\?|")/i],
      ['youtube', /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)([A-Za-z0-9\-_]+)(?:\/|\?|")/i],
    ];
    for (const [key, re] of patterns) {
      const m = html.match(re);
      if (m && m[1]) {
        // Reconstruir URL canónica
        if (key === 'instagram') links[key] = `https://instagram.com/${m[1]}`;
        else if (key === 'tiktok') links[key] = `https://tiktok.com/@${m[1]}`;
        else if (key === 'facebook') links[key] = `https://facebook.com/${m[1]}`;
        else if (key === 'linkedin') links[key] = `https://linkedin.com/company/${m[1]}`;
        else if (key === 'x') links[key] = `https://x.com/${m[1]}`;
        else if (key === 'youtube') links[key] = `https://youtube.com/@${m[1]}`;
      }
    }
    return links;
  } catch {
    return {};
  }
}

interface SocialStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  avg_engagement: number;
  by_platform: Record<string, { count: number; likes: number; comments: number; views: number }>;
  top_post: {
    post_url: string;
    caption: string | null;
    likes: number;
    comments: number;
    platform: string;
  } | null;
}

async function computeSocialStats(competitorId: string): Promise<SocialStats> {
  const posts = await prisma.socialPost.findMany({
    where: { competitorId },
    orderBy: { likes: 'desc' },
  });
  const by_platform: SocialStats['by_platform'] = {};
  let total_likes = 0;
  let total_comments = 0;
  let total_views = 0;
  let total_engagement = 0;
  for (const p of posts) {
    total_likes += p.likes;
    total_comments += p.comments;
    total_views += p.views;
    total_engagement += p.likes + p.comments * 3 + p.shares * 5;
    const k = String(p.platform);
    if (!by_platform[k]) by_platform[k] = { count: 0, likes: 0, comments: 0, views: 0 };
    by_platform[k].count += 1;
    by_platform[k].likes += p.likes;
    by_platform[k].comments += p.comments;
    by_platform[k].views += p.views;
  }
  const top = posts[0];
  return {
    total_posts: posts.length,
    total_likes,
    total_comments,
    total_views,
    avg_engagement: posts.length ? total_engagement / posts.length : 0,
    by_platform,
    top_post: top
      ? {
          post_url: top.postUrl,
          caption: top.caption,
          likes: top.likes,
          comments: top.comments,
          platform: String(top.platform),
        }
      : null,
  };
}

export const competitorsService = {
  async list(userId: string, projectId: string, status?: 'confirmed' | 'suggested' | 'rejected' | 'all') {
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
    const networks: ScrapeNetwork[] = options.networks ?? ['instagram', 'tiktok'];

    const project = await prisma.project.findUnique({ where: { id: competitor.projectId } });
    let socialLinks = (competitor.socialLinks ?? {}) as Record<string, string>;

    // Auto-descubrir redes sociales del website si no hay handles configurados
    // y es modo social/combined. Usa Firecrawl + regex para encontrar IG/TikTok en la home.
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

    // WEB analysis
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

    // SOCIAL analysis
    const currentSyncStatus: Record<string, { synced_at: string; post_count: number; handle?: string }> =
      (competitor.syncStatus as Record<string, { synced_at: string; post_count: number; handle?: string }> | null) ??
      {};
    const newSyncStatus = { ...currentSyncStatus };

    if (mode === 'social' || mode === 'combined') {
      const scrapeJobs: Promise<{ platform: ScrapeNetwork; count: number; handle: string } | null>[] = [];
      for (const net of networks) {
        const handle = extractHandle(net, socialLinks);
        if (!handle) continue;
        if (net === 'instagram') {
          scrapeJobs.push(
            instagramScraper
              .scrape({ handle, userId, projectId: competitor.projectId, competitorId: competitor.id })
              .then((r) => ({ platform: 'instagram' as const, count: r.posts.length, handle }))
              .catch((err) => {
                logger.warn({ err, handle }, 'instagram scrape failed in analyze');
                return null;
              }),
          );
        } else if (net === 'tiktok') {
          scrapeJobs.push(
            tiktokScraper
              .scrape({ handle, userId, projectId: competitor.projectId, competitorId: competitor.id })
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
    }

    const socialStats = await computeSocialStats(competitor.id);

    const combinedAnalysisData = {
      ...(webResult && typeof webResult === 'object' ? (webResult as object) : {}),
      social_stats: socialStats,
    };

    let engagementStats: EngagementStats | null = null;
    if (mode === 'social' || mode === 'combined') {
      engagementStats = await computeEngagementStatsInternal(competitor.id);
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

    return {
      competitor: updated,
      result: webResult,
      sync_status: newSyncStatus,
      social_stats: socialStats,
      engagement_stats: engagementStats,
    };
  },

  async computeAndStoreEngagementStats(competitorId: string, userId: string): Promise<EngagementStats> {
    await assertCompetitorOwner(competitorId, userId);
    const stats = await computeEngagementStatsInternal(competitorId);
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
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
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
      const eng = p.likes + p.comments * 3 + p.shares * 5;
      total_engagement += eng;
      total_likes += p.likes;
      total_comments += p.comments;
      const plat = String(p.platform);
      if (!by_platform[plat]) by_platform[plat] = { count: 0, likes: 0, comments: 0, views: 0, engagement: 0 };
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
        const week = Math.ceil(((d.getTime() - onejan) / 86400000 + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
        const key = `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
        weeks[key] = (weeks[key] ?? 0) + 1;
      }
    }

    const top_posts = [...posts]
      .sort((a, b) => b.likes + b.comments * 3 - (a.likes + a.comments * 3))
      .slice(0, 5)
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
