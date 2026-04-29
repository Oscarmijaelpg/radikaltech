import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ScheduledPost } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { schedulerService } from './service.js';

const platformEnum = z.enum([
  'instagram',
  'tiktok',
  'linkedin',
  'facebook',
  'x',
  'threads',
  'pinterest',
  'youtube',
  'other',
]);
const statusEnum = z.enum(['scheduled', 'published', 'cancelled', 'failed']);

const listQuery = z.object({
  project_id: z.string().uuid(),
  status: statusEnum.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const createSchema = z.object({
  project_id: z.string().uuid(),
  asset_id: z.string().uuid().nullable().optional(),
  platforms: z.array(platformEnum).min(1),
  caption: z.string().max(5000).nullable().optional(),
  hashtags: z.array(z.string().max(80)).max(60).optional(),
  scheduled_at: z.string().datetime(),
  notes: z.string().max(2000).nullable().optional(),
});

const patchSchema = z.object({
  asset_id: z.string().uuid().nullable().optional(),
  platforms: z.array(platformEnum).min(1).optional(),
  caption: z.string().max(5000).nullable().optional(),
  hashtags: z.array(z.string().max(80)).max(60).optional(),
  scheduled_at: z.string().datetime().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: statusEnum.optional(),
});

function serialize(p: ScheduledPost) {
  return {
    id: p.id,
    project_id: p.projectId,
    user_id: p.userId,
    asset_id: p.assetId,
    platforms: p.platforms,
    caption: p.caption,
    hashtags: p.hashtags,
    scheduled_at: p.scheduledAt,
    status: p.status,
    published_at: p.publishedAt,
    external_ids: p.externalIds,
    notes: p.notes,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export const schedulerRouter = new Hono<{ Variables: AuthVariables }>();

schedulerRouter.get('/', zValidator('query', listQuery), async (c) => {
  const user = c.get('user');
  const q = c.req.valid('query');
  const items = await schedulerService.list(user.id, q.project_id, {
    status: q.status,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
  });
  return c.json({ ok: true, data: items.map(serialize) });
});

schedulerRouter.get('/upcoming', async (c) => {
  const user = c.get('user');
  const limitRaw = c.req.query('limit');
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 5, 1), 20) : 5;
  const items = await schedulerService.listUpcomingForUser(user.id, limit);
  return c.json({ ok: true, data: items.map(serialize) });
});

schedulerRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const post = await schedulerService.create({
    userId: user.id,
    projectId: body.project_id,
    assetId: body.asset_id ?? null,
    platforms: body.platforms,
    caption: body.caption ?? null,
    hashtags: body.hashtags ?? [],
    scheduledAt: new Date(body.scheduled_at),
    notes: body.notes ?? null,
  });
  return c.json(ok(serialize(post)), 201);
});

schedulerRouter.patch('/:id', zValidator('json', patchSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const updated = await schedulerService.update(c.req.param('id'), user.id, {
    assetId: body.asset_id,
    platforms: body.platforms,
    caption: body.caption,
    hashtags: body.hashtags,
    scheduledAt: body.scheduled_at ? new Date(body.scheduled_at) : undefined,
    notes: body.notes,
    status: body.status,
  });
  return c.json(ok(serialize(updated)));
});

schedulerRouter.post('/:id/cancel', async (c) => {
  const user = c.get('user');
  const updated = await schedulerService.cancel(c.req.param('id'), user.id);
  return c.json(ok(serialize(updated)));
});

schedulerRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await schedulerService.remove(c.req.param('id'), user.id)));
});
