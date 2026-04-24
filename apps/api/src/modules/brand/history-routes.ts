import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { brandHistoryService } from './history-service.js';

const listQuerySchema = z.object({ project_id: z.string().uuid() });

export const brandHistoryRouter = new Hono<{ Variables: AuthVariables }>();

brandHistoryRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  return c.json(ok(await brandHistoryService.list(project_id, user.id)));
});

brandHistoryRouter.get('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await brandHistoryService.getById(c.req.param('id'), user.id)));
});

brandHistoryRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await brandHistoryService.remove(c.req.param('id'), user.id)));
});
