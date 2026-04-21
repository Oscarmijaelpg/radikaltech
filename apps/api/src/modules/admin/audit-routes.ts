import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { paginated, buildPageMeta } from '../../lib/response.js';

export const auditAdminRouter = new Hono<{ Variables: AuthVariables }>();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  actorId: z.string().uuid().optional(),
  actorEmail: z.string().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

auditAdminRouter.get('/', zValidator('query', listSchema), async (c) => {
  const q = c.req.valid('query');
  const where: Prisma.AdminAuditLogWhereInput = {};
  if (q.actorId) where.actorId = q.actorId;
  if (q.actorEmail) where.actorEmail = { contains: q.actorEmail, mode: 'insensitive' };
  if (q.action) where.action = { contains: q.action };
  if (q.targetType) where.targetType = q.targetType;
  if (q.targetId) where.targetId = q.targetId;
  if (q.from || q.to) {
    where.createdAt = {};
    if (q.from) where.createdAt.gte = new Date(q.from);
    if (q.to) where.createdAt.lte = new Date(q.to);
  }

  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return c.json(paginated(rows, buildPageMeta(q.page, q.pageSize, total)));
});
