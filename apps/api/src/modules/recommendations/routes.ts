import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { Forbidden, NotFound, BadRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { recommendationsService } from './service.js';
import { recommendationGenerator } from '../ai-services/index.js';
import { notificationService } from '../notifications/service.js';

const STATUS = ['new', 'saved', 'in_progress', 'completed', 'dismissed'] as const;
const KINDS = [
  'post',
  'campaign',
  'strategy',
  'report',
  'content_improvement',
  'competitor_response',
  'news_reaction',
] as const;

const listQuerySchema = z.object({
  project_id: z.string().uuid(),
  status: z.enum(STATUS).optional(),
  kind: z.enum(KINDS).optional(),
});

const patchSchema = z.object({
  status: z.enum(STATUS).optional(),
  user_notes: z.string().max(4000).nullable().optional(),
});

const generateSchema = z.object({ project_id: z.string().uuid() });

export const recommendationsRouter = new Hono<{ Variables: AuthVariables }>();

recommendationsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id, status, kind } = c.req.valid('query');
  const items = await recommendationsService.list(user.id, project_id, { status, kind });
  return c.json(ok(items));
});

recommendationsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const rec = await recommendationsService.getById(c.req.param('id'), user.id);
  return c.json(ok(rec));
});

recommendationsRouter.patch('/:id', zValidator('json', patchSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const id = c.req.param('id');
  let rec = await recommendationsService.getById(id, user.id);
  if (body.status) rec = await recommendationsService.updateStatus(id, user.id, body.status);
  if (body.user_notes !== undefined)
    rec = await recommendationsService.addNote(id, user.id, body.user_notes);
  return c.json(ok(rec));
});

recommendationsRouter.post('/:id/complete', async (c) => {
  const user = c.get('user');
  const rec = await recommendationsService.markAsCompleted(c.req.param('id'), user.id);
  return c.json(ok(rec));
});

recommendationsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  await recommendationsService.deleteRecommendation(c.req.param('id'), user.id);
  return c.json(ok({ deleted: true }));
});

recommendationsRouter.post('/generate', zValidator('json', generateSchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('json');
  // Verify ownership
  const project = await prisma.project.findUnique({ where: { id: project_id } });
  if (!project) throw new NotFound('Project not found');
  if (project.userId !== user.id) throw new Forbidden();

  // Create ai job record for observability
  const job = await prisma.aiJob.create({
    data: {
      kind: 'recommendations_generate',
      status: 'queued',
      input: { project_id },
      projectId: project_id,
      userId: user.id,
    },
  });

  try {
    await prisma.aiJob.update({ where: { id: job.id }, data: { status: 'running', startedAt: new Date() } });
    const items = await recommendationGenerator.generate({
      projectId: project_id,
      userId: user.id,
    });
    await prisma.aiJob.update({
      where: { id: job.id },
      data: {
        status: 'succeeded',
        output: { count: items.length },
        finishedAt: new Date(),
      },
    });
    return c.json(ok({ jobId: job.id, count: items.length, items }));
  } catch (err) {
    logger.error({ err }, 'recommendations generate failed');
    await prisma.aiJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: String(err), finishedAt: new Date() },
    });
    await notificationService
      .jobFailed({
        userId: user.id,
        projectId: project_id,
        jobKind: 'recommendations_generate',
        error: String(err),
      })
      .catch(() => null);
    if (err instanceof NotFound || err instanceof Forbidden || err instanceof BadRequest) throw err;
    throw new BadRequest('Failed to generate recommendations');
  }
});
