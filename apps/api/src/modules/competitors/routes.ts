import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { competitorsService } from './service.js';
import { competitorBenchmarkService } from './benchmark-service.js';

const benchmarkQuerySchema = z.object({ project_id: z.string().uuid() });

const socialLinksSchema = z.record(z.string()).optional().nullable();

const createSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  website: z.string().url().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  social_links: socialLinksSchema,
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  website: z.string().url().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  social_links: socialLinksSchema,
});

const listQuerySchema = z.object({
  project_id: z.string().uuid(),
  status: z.enum(['confirmed', 'suggested', 'rejected', 'all']).optional(),
});

const analyzeSchema = z
  .object({
    mode: z.enum(['web', 'social', 'combined']).optional(),
    networks: z.array(z.enum(['instagram', 'tiktok'])).optional(),
  })
  .optional();

const postsQuerySchema = z.object({
  platform: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function serialize(c: {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  website: string | null;
  socialLinks: unknown;
  notes: string | null;
  lastAnalyzedAt: Date | null;
  analysisData: unknown;
  syncStatus: unknown;
  engagementStats?: unknown;
  narrative?: unknown;
  narrativeGeneratedAt?: Date | null;
  status?: string;
  source?: string;
  detectedAt?: Date | null;
  createdAt: Date;
}) {
  const narrativeFresh =
    !!c.narrativeGeneratedAt &&
    !!c.lastAnalyzedAt &&
    c.narrativeGeneratedAt >= c.lastAnalyzedAt;
  return {
    id: c.id,
    project_id: c.projectId,
    user_id: c.userId,
    name: c.name,
    website: c.website,
    social_links: c.socialLinks,
    notes: c.notes,
    last_analyzed_at: c.lastAnalyzedAt,
    analysis_data: c.analysisData,
    sync_status: c.syncStatus,
    engagement_stats: c.engagementStats ?? null,
    narrative: c.narrative ?? null,
    narrative_generated_at: c.narrativeGeneratedAt ?? null,
    narrative_stale: !!c.narrative && !narrativeFresh,
    status: c.status ?? 'confirmed',
    source: c.source ?? 'manual',
    detected_at: c.detectedAt ?? null,
    created_at: c.createdAt,
  };
}

function serializePost(p: {
  id: string;
  competitorId: string | null;
  platform: unknown;
  postUrl: string;
  postId: string | null;
  caption: string | null;
  imageUrl: string | null;
  postType: string | null;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  postedAt: Date | null;
  scrapedAt: Date;
  visualAnalysis?: unknown;
}) {
  return {
    id: p.id,
    competitor_id: p.competitorId,
    platform: String(p.platform),
    post_url: p.postUrl,
    post_id: p.postId,
    caption: p.caption,
    image_url: p.imageUrl,
    post_type: p.postType,
    likes: p.likes,
    comments: p.comments,
    views: p.views,
    shares: p.shares,
    posted_at: p.postedAt,
    scraped_at: p.scrapedAt,
    visual_analysis: p.visualAnalysis ?? null,
  };
}

export const competitorsRouter = new Hono<{ Variables: AuthVariables }>();

competitorsRouter.get('/benchmark', zValidator('query', benchmarkQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  const data = await competitorBenchmarkService.getBenchmark(project_id, user.id);
  return c.json(ok(data));
});

competitorsRouter.get('/gaps', zValidator('query', benchmarkQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  const data = await competitorBenchmarkService.getGaps(project_id, user.id);
  return c.json(ok(data));
});

competitorsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id, status } = c.req.valid('query');
  const items = await competitorsService.list(user.id, project_id, status);
  return c.json(ok(items.map(serialize)));
});

competitorsRouter.patch('/:id/approve', async (c) => {
  const user = c.get('user');
  const updated = await competitorsService.setStatus(c.req.param('id'), user.id, 'confirmed');
  return c.json(ok(serialize(updated)));
});

competitorsRouter.patch('/:id/reject', async (c) => {
  const user = c.get('user');
  const updated = await competitorsService.setStatus(c.req.param('id'), user.id, 'rejected');
  return c.json(ok(serialize(updated)));
});

competitorsRouter.post(
  '/bulk-approve',
  zValidator('json', z.object({ ids: z.array(z.string().uuid()).min(1).max(100) })),
  async (c) => {
    const user = c.get('user');
    const { ids } = c.req.valid('json');
    const res = await competitorsService.bulkSetStatus(ids, user.id, 'confirmed');
    return c.json(ok(res));
  },
);

competitorsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const created = await competitorsService.create(user.id, {
    project_id: body.project_id,
    name: body.name,
    website: body.website ?? null,
    notes: body.notes ?? null,
    social_links: body.social_links ?? null,
  });
  return c.json(ok(serialize(created)), 201);
});

competitorsRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const updated = await competitorsService.update(c.req.param('id'), user.id, {
    name: body.name,
    website: body.website,
    notes: body.notes,
    social_links: body.social_links,
  });
  return c.json(ok(serialize(updated)));
});

competitorsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const res = await competitorsService.remove(c.req.param('id'), user.id);
  return c.json(ok(res));
});

competitorsRouter.post('/:id/analyze', async (c) => {
  const user = c.get('user');
  let body: { mode?: 'web' | 'social' | 'combined'; networks?: Array<'instagram' | 'tiktok'> } | undefined;
  try {
    const raw = await c.req.json().catch(() => undefined);
    const parsed = analyzeSchema.safeParse(raw);
    body = parsed.success ? parsed.data : undefined;
  } catch {
    body = undefined;
  }
  const { competitor, result, sync_status, social_stats, engagement_stats } = await competitorsService.analyze(
    c.req.param('id'),
    user.id,
    { mode: body?.mode, networks: body?.networks },
  );
  return c.json(
    ok({
      competitor: serialize(competitor),
      result,
      sync_status,
      social_stats,
      engagement_stats,
    }),
  );
});

const syncSocialSchema = z
  .object({ networks: z.array(z.enum(['instagram', 'tiktok'])).optional() })
  .optional();

competitorsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const comp = await competitorsService.getById(c.req.param('id'), user.id);
  return c.json(ok(serialize(comp)));
});

competitorsRouter.post('/:id/sync-social', async (c) => {
  const user = c.get('user');
  let body: { networks?: Array<'instagram' | 'tiktok'> } | undefined;
  try {
    const raw = await c.req.json().catch(() => undefined);
    const parsed = syncSocialSchema.safeParse(raw);
    body = parsed.success ? parsed.data : undefined;
  } catch {
    body = undefined;
  }
  const res = await competitorsService.syncSocial(c.req.param('id'), user.id, body?.networks);
  return c.json(ok(res), 202);
});

competitorsRouter.post('/:id/regenerate-narrative', async (c) => {
  const user = c.get('user');
  const res = await competitorsService.regenerateNarrative(c.req.param('id'), user.id);
  return c.json(ok(res), 202);
});

competitorsRouter.get('/:id/posts', zValidator('query', postsQuerySchema), async (c) => {
  const user = c.get('user');
  const { platform, limit } = c.req.valid('query');
  const posts = await competitorsService.getPosts(c.req.param('id'), user.id, { platform, limit });
  return c.json(ok(posts.map(serializePost)));
});

competitorsRouter.get('/:id/stats', async (c) => {
  const user = c.get('user');
  const stats = await competitorsService.getStats(c.req.param('id'), user.id);
  return c.json(ok(stats));
});
