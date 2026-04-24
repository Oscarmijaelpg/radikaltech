import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { scheduledReportsService } from './service.js';

const KINDS = ['news_digest', 'competition_weekly', 'brand_monthly', 'custom'] as const;
const FREQS = ['daily', 'weekly', 'monthly'] as const;

const listQuerySchema = z.object({ project_id: z.string().uuid() });
const createSchema = z.object({
  project_id: z.string().uuid(),
  kind: z.enum(KINDS),
  frequency: z.enum(FREQS),
  title: z.string().min(1).max(200),
  config: z.record(z.unknown()).optional(),
});
const patchSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(FREQS).optional(),
  title: z.string().min(1).max(200).optional(),
  config: z.record(z.unknown()).optional(),
});

export const scheduledReportsRouter = new Hono<{ Variables: AuthVariables }>();

scheduledReportsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  const items = await scheduledReportsService.list(user.id, project_id);
  return c.json(ok(items));
});

scheduledReportsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const created = await scheduledReportsService.create({
    userId: user.id,
    projectId: body.project_id,
    kind: body.kind,
    frequency: body.frequency,
    title: body.title,
    config: body.config,
  });
  return c.json(ok(created), 201);
});

scheduledReportsRouter.patch('/:id', zValidator('json', patchSchema), async (c) => {
  const user = c.get('user');
  const patch = c.req.valid('json');
  const updated = await scheduledReportsService.update(c.req.param('id'), user.id, patch);
  return c.json(ok(updated));
});

scheduledReportsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  await scheduledReportsService.remove(c.req.param('id'), user.id);
  return c.json(ok({ deleted: true }));
});

scheduledReportsRouter.post('/:id/run-now', async (c) => {
  const user = c.get('user');
  const updated = await scheduledReportsService.runNow(c.req.param('id'), user.id);
  return c.json(ok(updated));
});
