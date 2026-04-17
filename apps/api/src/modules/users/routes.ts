import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAdmin, type AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { usersService } from './service.js';

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  avatar_url: z.string().url().optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

export const usersRouter = new Hono<{ Variables: AuthVariables }>();

usersRouter.get('/me', async (c) => {
  const user = c.get('user');
  const profile = await usersService.getMe(user.id);
  return c.json(ok(profile));
});

usersRouter.patch('/me', zValidator('json', updateProfileSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const profile = await usersService.updateMe(user.id, body);
  return c.json(ok(profile));
});

usersRouter.get('/me/export', async (c) => {
  const user = c.get('user');
  const data = await usersService.exportAll(user.id);
  return c.json(ok(data));
});

usersRouter.delete('/me', async (c) => {
  const user = c.get('user');
  await usersService.deleteSelf(user.id);
  return c.json(ok({ deleted: true }));
});

usersRouter.get('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const profile = await usersService.getById(id);
  return c.json(ok(profile));
});
