import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { Forbidden, NotFound } from '../../lib/errors.js';
import { prisma } from '@radikal/db';
import { getProjectStats, getUserStats } from './service.js';
import { onboardingProgressRouter } from './onboarding-progress-routes.js';

const statsQuerySchema = z.object({
  project_id: z.string().uuid(),
});

export const statsRouter = new Hono<{ Variables: AuthVariables }>();

statsRouter.route('/', onboardingProgressRouter);

statsRouter.get('/user', async (c) => {
  const user = c.get('user');
  const data = await getUserStats(user.id);
  return c.json(ok(data));
});

statsRouter.get('/', zValidator('query', statsQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  const project = await prisma.project.findUnique({ where: { id: project_id } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== user.id) throw new Forbidden();
  const data = await getProjectStats(user.id, project_id);
  return c.json(ok(data));
});
