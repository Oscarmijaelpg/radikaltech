import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ContentAsset } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { contentService } from './service.js';
import { ideationService } from './ideation-service.js';
import { contentEvaluator } from '../ai-services/index.js';

const assetTypeEnum = z.enum(['image', 'video', 'document', 'audio']);

const listQuery = z.object({
  project_id: z.string().uuid(),
  type: assetTypeEnum.optional(),
  sort: z.enum(['recent', 'score']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createSchema = z.object({
  project_id: z.string().uuid(),
  asset_url: z.string().url(),
  asset_type: assetTypeEnum,
  metadata: z.record(z.unknown()).optional(),
});

const patchSchema = z.object({
  tags: z.array(z.string()).optional(),
  ai_description: z.string().nullable().optional(),
});

function serializeAsset(a: ContentAsset) {
  return {
    id: a.id,
    project_id: a.projectId,
    user_id: a.userId,
    asset_url: a.assetUrl,
    asset_type: a.assetType,
    ai_description: a.aiDescription,
    aesthetic_score: a.aestheticScore !== null && a.aestheticScore !== undefined
      ? Number(a.aestheticScore)
      : null,
    marketing_feedback: a.marketingFeedback,
    tags: a.tags,
    metadata: a.metadata,
    created_at: a.createdAt,
  };
}

export const contentRouter = new Hono<{ Variables: AuthVariables }>();

contentRouter.get('/', zValidator('query', listQuery), async (c) => {
  const user = c.get('user');
  const q = c.req.valid('query');
  const res = await contentService.list(user.id, q.project_id, {
    type: q.type,
    sort: q.sort,
    limit: q.limit,
    offset: q.offset,
  });
  return c.json({
    ok: true,
    data: res.items.map(serializeAsset),
    meta: { total: res.total, limit: res.limit, offset: res.offset },
  });
});

contentRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const asset = await contentService.create({
    userId: user.id,
    projectId: body.project_id,
    asset_url: body.asset_url,
    asset_type: body.asset_type,
    metadata: body.metadata,
  });
  return c.json(ok(serializeAsset(asset)), 201);
});

contentRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const asset = await contentService.getById(c.req.param('id'), user.id);
  return c.json(ok(serializeAsset(asset)));
});

contentRouter.patch('/:id', zValidator('json', patchSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const updated = await contentService.update(c.req.param('id'), user.id, body);
  return c.json(ok(serializeAsset(updated)));
});

contentRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await contentService.remove(c.req.param('id'), user.id)));
});

contentRouter.post('/:id/evaluate', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const res = await contentEvaluator.evaluate({ assetId: id, userId: user.id });
  const asset = await contentService.getById(id, user.id);
  return c.json(ok({ job_id: res.jobId, result: res.result, asset: serializeAsset(asset) }));
});

const generateIdeasSchema = z.object({
  project_id: z.string().uuid(),
  angle: z.enum(['educativo', 'entretenimiento', 'venta', 'storytelling', 'auto']).optional(),
  count: z.number().int().min(1).max(8).optional(),
});

contentRouter.post('/generate-ideas', zValidator('json', generateIdeasSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const res = await ideationService.generateIdeas({
    projectId: body.project_id,
    userId: user.id,
    angle: body.angle,
    count: body.count,
  });
  return c.json(ok(res));
});
