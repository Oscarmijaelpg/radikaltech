import { Hono } from 'hono';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { jobsService } from './service.js';

export const jobsRouter = new Hono<{ Variables: AuthVariables }>();

jobsRouter.get('/active', async (c) => {
  const user = c.get('user');
  const projectId = c.req.query('project_id') ?? undefined;
  return c.json(ok(await jobsService.listActive(user.id, projectId)));
});

jobsRouter.get('/recent', async (c) => {
  const user = c.get('user');
  const projectId = c.req.query('project_id') ?? undefined;
  const limit = Number(c.req.query('limit') ?? 10);
  return c.json(ok(await jobsService.listRecent(user.id, projectId, limit)));
});

jobsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await jobsService.getById(c.req.param('id'), user.id)));
});
