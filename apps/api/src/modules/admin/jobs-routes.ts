import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok, paginated, buildPageMeta } from '../../lib/response.js';
import { NotFound } from '../../lib/errors.js';
import { logAudit } from './audit-service.js';

export const jobsAdminRouter = new Hono<{ Variables: AuthVariables }>();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']).optional(),
  kind: z.string().optional(),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

jobsAdminRouter.get('/', zValidator('query', listSchema), async (c) => {
  const q = c.req.valid('query');
  const where: Prisma.AiJobWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.kind) where.kind = q.kind;
  if (q.userId) where.userId = q.userId;
  if (q.projectId) where.projectId = q.projectId;
  if (q.from || q.to) {
    where.createdAt = {};
    if (q.from) where.createdAt.gte = new Date(q.from);
    if (q.to) where.createdAt.lte = new Date(q.to);
  }

  const [total, rows] = await Promise.all([
    prisma.aiJob.count({ where }),
    prisma.aiJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    }),
  ]);

  return c.json(paginated(rows, buildPageMeta(q.page, q.pageSize, total)));
});

jobsAdminRouter.get('/kinds', async (c) => {
  const rows = await prisma.aiJob.groupBy({
    by: ['kind'],
    _count: { _all: true },
    orderBy: { _count: { kind: 'desc' } },
  });
  return c.json(ok(rows.map((r) => ({ kind: r.kind, count: r._count._all }))));
});

jobsAdminRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const job = await prisma.aiJob.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });
  if (!job) throw new NotFound('Job no encontrado');
  return c.json(ok(job));
});

jobsAdminRouter.post('/:id/retry', async (c) => {
  const id = c.req.param('id');
  const job = await prisma.aiJob.findUnique({ where: { id } });
  if (!job) throw new NotFound('Job no encontrado');

  const retried = await prisma.aiJob.create({
    data: {
      userId: job.userId,
      projectId: job.projectId,
      kind: job.kind,
      status: 'queued',
      input: job.input ?? Prisma.DbNull,
    },
  });

  await logAudit(c, {
    action: 'job.retry',
    targetType: 'ai_job',
    targetId: id,
    metadata: { retryJobId: retried.id, kind: job.kind },
  });

  return c.json(ok(retried));
});
