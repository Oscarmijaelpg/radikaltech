import { randomUUID } from 'node:crypto';
import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { BadRequest } from '../../lib/errors.js';
import { APIFY_ACTORS, apifyRunSyncUrl } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { imageAnalyzer } from './image-analyzer.js';
import { ContentEvaluator } from './content-evaluator.js';
import { notificationService } from '../notifications/service.js';

const STORAGE_BUCKET = 'assets';
const ACTOR_ID = APIFY_ACTORS.instagram;

export interface ScrapeInstagramInput {
  handle: string;
  userId: string;
  projectId: string;
  competitorId?: string;
}

export interface ScrapedInstagramPost {
  url: string;
  caption?: string;
  assetId: string;
}

export interface ScrapeInstagramResult {
  jobId: string;
  posts: ScrapedInstagramPost[];
}

interface ApifyPostItem {
  url?: string;
  shortCode?: string;
  displayUrl?: string;
  caption?: string;
  timestamp?: string;
  takenAt?: string;
  type?: string;
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  id?: string;
}

interface ApifyProfileItem {
  id?: string;
  username?: string;
  fullName?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  biography?: string;
  latestPosts?: ApifyPostItem[];
}

export function parseInstagramHandle(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^@/, '');
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (!/instagram\.com$/i.test(u.hostname) && !u.hostname.endsWith('instagram.com')) {
        return null;
      }
      const first = u.pathname.split('/').filter(Boolean)[0];
      return first ?? null;
    } catch {
      return null;
    }
  }
  const first = s.split('/')[0];
  return first ?? null;
}

export async function runVisualAnalysisForCompetitor(
  competitorId: string,
  platform: 'instagram' | 'tiktok',
): Promise<void> {
  try {
    const posts = await prisma.socialPost.findMany({
      where: { competitorId, platform },
      orderBy: [{ likes: 'desc' }, { comments: 'desc' }],
      take: 5,
    });
    const candidates = posts.filter((p) => p.imageUrl && !p.visualAnalysis);
    if (candidates.length === 0) return;
    const start = Date.now();
    logger.info({ competitorId, platform, count: candidates.length }, 'visual-analysis start');
    const results = await Promise.allSettled(
      candidates.map(async (p) => {
        const va = await imageAnalyzer.analyze(p.imageUrl as string);
        if (!va) return { id: p.id, ok: false };
        await prisma.socialPost.update({
          where: { id: p.id },
          data: {
            visualAnalysis: {
              ...va,
              auto_generated: true,
              analyzed_at: new Date().toISOString(),
            } as unknown as unknown as Prisma.InputJsonValue,
          },
        });
        return { id: p.id, ok: true };
      }),
    );
    const ok = results.filter((r) => r.status === 'fulfilled' && (r.value as { ok: boolean }).ok).length;
    logger.info(
      { competitorId, platform, ok, total: candidates.length, ms: Date.now() - start },
      'visual-analysis done',
    );
  } catch (err) {
    logger.warn({ err, competitorId, platform }, 'visual-analysis batch failed');
  }
}

export class InstagramScraper {
  async scrape(input: ScrapeInstagramInput): Promise<ScrapeInstagramResult> {
    if (!env.APIFY_API_KEY) {
      throw new BadRequest('APIFY_API_KEY no está configurado');
    }
    const handle = input.handle.replace(/^@/, '').trim();
    if (!handle) throw new BadRequest('Handle de Instagram inválido');

    const job = await prisma.aiJob.create({
      data: {
        kind: 'instagram_scrape',
        status: 'running',
        input: { handle, resultsLimit: 9 },
        projectId: input.projectId,
        userId: input.userId,
        startedAt: new Date(),
      },
    });

    try {
      logger.info({ handle }, 'apify instagram scrape start');
      const res = await fetch(
        apifyRunSyncUrl(ACTOR_ID, env.APIFY_API_KEY ?? ''),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [handle], resultsLimit: 9 }),
          signal: AbortSignal.timeout(60_000),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new BadRequest(`Apify ${res.status}: ${text.slice(0, 300)}`);
      }
      const rawItems = (await res.json()) as ApifyProfileItem[];

      // Apify instagram-profile-scraper returns profile objects with latestPosts nested inside.
      // Extract the posts from the first profile item.
      const profile = Array.isArray(rawItems) ? rawItems[0] : null;
      const items: ApifyPostItem[] = profile?.latestPosts ?? [];
      logger.info(
        { handle, profileFound: !!profile, followers: profile?.followersCount, postCount: items.length },
        'apify instagram scrape ok',
      );

      // Update social_account with handle and follower count if available
      // Update profile data: if competitor, update competitor table. If brand, update socialAccount.
      if (profile) {
        try {
          if (input.competitorId) {
            await prisma.competitor.update({
              where: { id: input.competitorId },
              data: {
                engagementStats: {
                  followers: profile.followersCount ?? 0,
                  handle: profile.username ?? handle,
                  lastScrapedAt: new Date().toISOString(),
                } as any,
              },
            });
          } else {
            await prisma.socialAccount.updateMany({
              where: { 
                projectId: input.projectId, 
                platform: 'instagram',
                // For the brand, we don't have competitorId in this table
              },
              data: {
                handle: profile.username ?? handle,
                followers: profile.followersCount ?? null,
              },
            });
          }
        } catch (err) {
          logger.warn({ err, competitorId: input.competitorId }, 'failed to update profile data');
        }
      }

      const posts: ScrapedInstagramPost[] = [];

      for (const item of items) {
        if (!item.displayUrl) continue;
        try {
          const imgRes = await fetch(item.displayUrl, { signal: AbortSignal.timeout(20_000) });
          if (!imgRes.ok) {
            logger.warn({ status: imgRes.status }, 'ig image download failed');
            continue;
          }
          const arr = new Uint8Array(await imgRes.arrayBuffer());
          const path = `${input.userId}/instagram/${randomUUID()}.jpg`;
          const up = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(path, arr, { contentType: 'image/jpeg', upsert: false });
          if (up.error) {
            logger.warn({ err: up.error.message }, 'ig storage upload failed');
            continue;
          }
          const pub = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
          const publicUrl = pub.data?.publicUrl;
          if (!publicUrl) continue;

          const postUrl = item.url ?? (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : '');
          const caption = item.caption ?? '';
          const publishedAt = item.timestamp ?? item.takenAt ?? null;

          // Analizar antes de guardar si NO es un competidor
          let evaluation = null;
          if (!input.competitorId) {
            try {
              evaluation = await ContentEvaluator.evaluateImageUrl(publicUrl);
            } catch (err) {
              logger.warn({ err, publicUrl }, 'pre-analysis failed for instagram asset');
            }
          }

          const asset = await prisma.contentAsset.create({
            data: {
              projectId: input.projectId,
              userId: input.userId,
              assetType: 'image',
              assetUrl: publicUrl,
              aestheticScore: evaluation?.marketing.aesthetic_score,
              marketingFeedback: evaluation?.marketing.marketing_feedback,
              aiDescription: evaluation?.art?.full_narrative || evaluation?.art?.description || null,
              tags: Array.from(new Set([
                'instagram', 
                'social_auto', 
                ...(input.competitorId ? ['competitor'] : []),
                ...(evaluation?.marketing.tags || [])
              ])),
              metadata: {
                source: 'instagram_scrape',
                post_url: postUrl,
                caption,
                published_at: publishedAt,
                storage_path: path,
                handle,
                suggestions: evaluation?.marketing.suggestions,
                detected_elements: evaluation?.marketing.detected_elements,
                visual_analysis: evaluation?.art,
              } as unknown as Prisma.InputJsonValue,
            },
          });
          posts.push({ url: postUrl, caption, assetId: asset.id });

          if (postUrl) {
            try {
              const postData = {
                caption,
                imageUrl: publicUrl,
                likes: item.likesCount ?? 0,
                comments: item.commentsCount ?? 0,
                views: item.videoViewCount ?? item.videoPlayCount ?? 0,
                postType: item.type ?? null,
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
                    platform: 'instagram',
                    postUrl,
                    postId: item.id ?? item.shortCode ?? null,
                  },
                });
              } else {
                // Brand case: no competitorId. Use findFirst to avoid duplicates if possible, or just create.
                // Since there's no unique constraint for (projectId, postUrl) where competitorId is null in schema,
                // we search manually.
                const existing = await prisma.socialPost.findFirst({
                  where: {
                    projectId: input.projectId,
                    platform: 'instagram',
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
                      platform: 'instagram',
                      postUrl,
                      postId: item.id ?? item.shortCode ?? null,
                    },
                  });
                }
              }
            } catch (err) {
              logger.warn({ err, competitorId: input.competitorId }, 'ig social_posts persistence failed');
            }
          }
        } catch (err) {
          logger.warn({ err }, 'failed to persist ig post');
        }
      }

      // Visual analysis of top-engagement posts (async, non-blocking failure)
      if (input.competitorId) {
        await runVisualAnalysisForCompetitor(input.competitorId, 'instagram');
      } else {
        // Para la propia marca, también podemos correr el análisis si queremos, 
        // pero runVisualAnalysisForCompetitor espera un competitorId.
        // TODO: Implementar runVisualAnalysisForProject
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
      logger.error({ err }, 'instagram scraper failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService.jobFailed({
        userId: input.userId,
        projectId: input.projectId ?? null,
        jobKind: 'instagram_scrape',
        error: String(err),
      });
      throw err;
    }
  }
}
