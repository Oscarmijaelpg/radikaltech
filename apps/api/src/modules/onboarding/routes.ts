import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { onboardingService, stepBodySchema } from './service.js';

export const onboardingRouter = new Hono<{ Variables: AuthVariables }>();

onboardingRouter.get('/state', async (c) => {
  const user = c.get('user');
  return c.json(ok(await onboardingService.getState(user.id)));
});

onboardingRouter.post('/step', zValidator('json', stepBodySchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  return c.json(ok(await onboardingService.applyStep(user.id, body)));
});

onboardingRouter.post('/complete', async (c) => {
  const user = c.get('user');
  return c.json(ok(await onboardingService.complete(user.id)));
});
