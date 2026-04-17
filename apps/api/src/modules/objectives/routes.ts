import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { objectivesService } from './service.js';

const createSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  kpi: z.string().max(120).optional(),
  target_value: z.number().optional(),
  due_date: z.coerce.date().optional(),
  status: z.string().max(40).optional(),
});

const updateSchema = createSchema.partial();
const listQuerySchema = z.object({ project_id: z.string().uuid() });

export const objectivesRouter = new Hono<{ Variables: AuthVariables }>();

objectivesRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  return c.json(ok(await objectivesService.list(project_id, user.id)));
});

objectivesRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  return c.json(ok(await objectivesService.create(user.id, body)), 201);
});

objectivesRouter.get('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await objectivesService.getById(c.req.param('id'), user.id)));
});

objectivesRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  return c.json(ok(await objectivesService.update(c.req.param('id'), user.id, body)));
});

objectivesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  return c.json(ok(await objectivesService.remove(c.req.param('id'), user.id)));
});
