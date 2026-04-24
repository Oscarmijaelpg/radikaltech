import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { socialAccountsService } from './service.js';

const createSchema = z.object({
  project_id: z.string().uuid(),
  platform: z.string().min(1).max(50),
  handle: z.string().max(120).optional(),
  source: z.enum(['url', 'manual']),
  url: z.string().url().optional(),
  manual_description: z.string().max(4000).optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({ project_id: z.string().uuid() });

export const socialAccountsRouter = new Hono<{ Variables: AuthVariables }>();

socialAccountsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  return c.json(ok(await socialAccountsService.listByProject(project_id, user.id)));
});

socialAccountsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  return c.json(ok(await socialAccountsService.create(user.id, body)), 201);
});

socialAccountsRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  return c.json(ok(await socialAccountsService.update(c.req.param('id'), user.id, body)));
});

socialAccountsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await socialAccountsService.remove(c.req.param('id'), user.id)));
});
