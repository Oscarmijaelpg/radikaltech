import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok, paginated, buildPageMeta } from '../../lib/response.js';
import { NotFound } from '../../lib/errors.js';
import { logAudit } from './audit-service.js';

export const scheduledReportsAdminRouter = new Hono<{ Variables: AuthVariables }>();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  kind: z.enum(['news_digest', 'competition_weekly', 'brand_monthly', 'custom']).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  enabled: z.enum(['true', 'false']).optional(),
  userId: z.string().uuid().optional(),
});

scheduledReportsAdminRouter.get('/', zValidator('query', listSchema), async (c) => {
  const q = c.req.valid('query');
  const where: Prisma.ScheduledReportWhereInput = {};
  if (q.kind) where.kind = q.kind;
  if (q.frequency) where.frequency = q.frequency;
  if (q.enabled) where.enabled = q.enabled === 'true';
  if (q.userId) where.userId = q.userId;

  const [total, rows] = await Promise.all([
    prisma.scheduledReport.count({ where }),
    prisma.scheduledReport.findMany({
      where,
      orderBy: { nextRunAt: 'asc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);

  return c.json(paginated(rows, buildPageMeta(q.page, q.pageSize, total)));
});

const patchSchema = z.object({
  enabled: z.boolean().optional(),
});

scheduledReportsAdminRouter.patch('/:id', zValidator('json', patchSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const before = await prisma.scheduledReport.findUnique({ where: { id } });
  if (!before) throw new NotFound('No encontrado');

  const updated = await prisma.scheduledReport.update({
    where: { id },
    data: { ...(body.enabled !== undefined ? { enabled: body.enabled } : {}) },
  });

  await logAudit(c, {
    action: 'scheduled_report.update',
    targetType: 'scheduled_report',
    targetId: id,
    diff: { before: { enabled: before.enabled }, after: body },
  });

  return c.json(ok(updated));
});

scheduledReportsAdminRouter.post('/:id/run-now', async (c) => {
  const id = c.req.param('id');
  const before = await prisma.scheduledReport.findUnique({ where: { id } });
  if (!before) throw new NotFound('No encontrado');

  const updated = await prisma.scheduledReport.update({
    where: { id },
    data: { nextRunAt: new Date() },
  });

  await logAudit(c, {
    action: 'scheduled_report.run_now',
    targetType: 'scheduled_report',
    targetId: id,
  });

  return c.json(ok(updated));
});
