import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { APIFY_ACTORS, apifyRunSyncUrl } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { runVisualAnalysisForCompetitor } from './instagram-scraper.js';
import { notificationService } from '../notifications/service.js';

const ACTOR_ID = APIFY_ACTORS.tiktok;

export interface ScrapeTikTokInput {
  handle: string;
  userId: string;
  projectId: string;
  competitorId?: string;
}

export interface ScrapedTikTokPost {
  url: string;
  caption?: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface ScrapeTikTokResult {
  jobId: string;
  posts: ScrapedTikTokPost[];
}

interface ApifyTikTokItem {
  id?: string;
  webVideoUrl?: string;
  text?: string;
  playCount?: number;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  createTimeISO?: string;
  createTime?: number;
  videoMeta?: { coverUrl?: string; originalCoverUrl?: string };
}

export function parseTikTokHandle(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^@/, '');
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (!u.hostname.endsWith('tiktok.com')) return null;
      const first = u.pathname.split('/').filter(Boolean)[0] ?? '';
      return first.replace(/^@/, '') || null;
    } catch {
      return null;
    }
  }
  return s.split('/')[0] ?? null;
}

export class TikTokScraper {
  async scrape(input: ScrapeTikTokInput): Promise<ScrapeTikTokResult> {
    if (!env.APIFY_API_KEY) throw new Error('APIFY_API_KEY not configured');
    const handle = input.handle.replace(/^@/, '').trim();
    if (!handle) throw new Error('Invalid tiktok handle');

    const job = await prisma.aiJob.create({
      data: {
        kind: 'tiktok_scrape',
        status: 'running',
        input: { handle, resultsPerPage: 10 },
        projectId: input.projectId,
        userId: input.userId,
        startedAt: new Date(),
      },
    });

    try {
      logger.info({ handle }, 'apify tiktok scrape start');
      const res = await fetch(
        apifyRunSyncUrl(ACTOR_ID, env.APIFY_API_KEY ?? ''),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profiles: [handle], resultsPerPage: 10 }),
          signal: AbortSignal.timeout(90_000),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Apify ${res.status}: ${text.slice(0, 300)}`);
      }
      const items = (await res.json()) as ApifyTikTokItem[];
      logger.info({ handle, count: items?.length ?? 0 }, 'apify tiktok scrape ok');

      const posts: ScrapedTikTokPost[] = [];

      for (const item of Array.isArray(items) ? items : []) {
        const postUrl = item.webVideoUrl;
        if (!postUrl) continue;
        const likes = item.diggCount ?? 0;
        const comments = item.commentCount ?? 0;
        const shares = item.shareCount ?? 0;
        const views = item.playCount ?? 0;
        const caption = item.text ?? '';
        const coverUrl = item.videoMeta?.coverUrl ?? item.videoMeta?.originalCoverUrl ?? null;
        const publishedAt =
          item.createTimeISO ?? (item.createTime ? new Date(item.createTime * 1000).toISOString() : null);

        posts.push({ url: postUrl, caption, likes, comments, shares, views });

        if (postUrl) {
          try {
            const postData = {
              caption,
              imageUrl: coverUrl,
              likes,
              comments,
              shares,
              views,
              postType: 'video',
              postedAt: publishedAt ? new Date(publishedAt) : null,
              raw: item as unknown as Prisma.InputJsonValue,
            };

            if (input.competitorId) {
              await prisma.socialPost.upsert({
                where: {
                  competitorId_postUrl: {
                    competitorId: input.competitorId,
                    postUrl,
                  },
                },
                update: postData,
                create: {
                  ...postData,
                  competitorId: input.competitorId,
                  userId: input.userId,
                  projectId: input.projectId,
                  platform: 'tiktok',
                  postUrl,
                  postId: item.id ?? null,
                },
              });
            } else {
              const existing = await prisma.socialPost.findFirst({
                where: {
                  projectId: input.projectId,
                  platform: 'tiktok',
                  postUrl,
                  competitorId: null,
                },
              });

              if (existing) {
                await prisma.socialPost.update({
                  where: { id: existing.id },
                  data: postData,
                });
              } else {
                await prisma.socialPost.create({
                  data: {
                    ...postData,
                    competitorId: null,
                    userId: input.userId,
                    projectId: input.projectId,
                    platform: 'tiktok',
                    postUrl,
                    postId: item.id ?? null,
                  },
                });
              }
            }
          } catch (err) {
            logger.warn({ err, competitorId: input.competitorId }, 'tiktok social_posts persistence failed');
          }
        }
      }

      if (input.competitorId) {
        await runVisualAnalysisForCompetitor(input.competitorId, 'tiktok');
      }

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: { count: posts.length, posts } as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      return { jobId: job.id, posts };
    } catch (err) {
      logger.error({ err }, 'tiktok scraper failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService.jobFailed({
        userId: input.userId,
        projectId: input.projectId ?? null,
        jobKind: 'tiktok_scrape',
        error: String(err),
      });
      throw err;
    }
  }
}
