import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok, paginated, buildPageMeta } from '../../lib/response.js';
import { NotFound } from '../../lib/errors.js';
import { logAudit } from './audit-service.js';

export const moderationAdminRouter = new Hono<{ Variables: AuthVariables }>();

const baseListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  q: z.string().optional(),
});

moderationAdminRouter.get(
  '/recommendations',
  zValidator(
    'query',
    baseListSchema.extend({
      status: z.enum(['new', 'saved', 'in_progress', 'completed', 'dismissed']).optional(),
      kind: z
        .enum(['post', 'campaign', 'strategy', 'report', 'content_improvement', 'competitor_response', 'news_reaction'])
        .optional(),
    }),
  ),
  async (c) => {
    const q = c.req.valid('query');
    const where: Prisma.RecommendationWhereInput = {};
    if (q.userId) where.userId = q.userId;
    if (q.projectId) where.projectId = q.projectId;
    if (q.status) where.status = q.status;
    if (q.kind) where.kind = q.kind;
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: 'insensitive' } },
        { why: { contains: q.q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.recommendation.count({ where }),
      prisma.recommendation.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { user: { select: { id: true, email: true } } },
      }),
    ]);

    return c.json(paginated(rows, buildPageMeta(q.page, q.pageSize, total)));
  },
);

moderationAdminRouter.delete('/recommendations/:id', async (c) => {
  const id = c.req.param('id');
  const before = await prisma.recommendation.findUnique({ where: { id } });
  if (!before) throw new NotFound('No encontrado');
  await prisma.recommendation.delete({ where: { id } });
  await logAudit(c, {
    action: 'recommendation.delete',
    targetType: 'recommendation',
    targetId: id,
    diff: { title: before.title, userId: before.userId },
  });
  return c.json(ok({ deleted: true }));
});

moderationAdminRouter.get(
  '/content-assets',
  zValidator(
    'query',
    baseListSchema.extend({
      assetType: z.enum(['image', 'video', 'document', 'audio']).optional(),
    }),
  ),
  async (c) => {
    const q = c.req.valid('query');
    const where: Prisma.ContentAssetWhereInput = {};
    if (q.userId) where.userId = q.userId;
    if (q.projectId) where.projectId = q.projectId;
    if (q.assetType) where.assetType = q.assetType;

    const [total, rows] = await Promise.all([
      prisma.contentAsset.count({ where }),
      prisma.contentAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { user: { select: { id: true, email: true } } },
      }),
    ]);

    return c.json(paginated(rows, buildPageMeta(q.page, q.pageSize, total)));
  },
);

moderationAdminRouter.delete('/content-assets/:id', async (c) => {
  const id = c.req.param('id');
  const before = await prisma.contentAsset.findUnique({ where: { id } });
  if (!before) throw new NotFound('No encontrado');
  await prisma.contentAsset.delete({ where: { id } });
  await logAudit(c, {
    action: 'content_asset.delete',
    targetType: 'content_asset',
    targetId: id,
    diff: { assetUrl: before.assetUrl, userId: before.userId },
  });
  return c.json(ok({ deleted: true }));
});

moderationAdminRouter.get(
  '/reports',
  zValidator(
    'query',
    baseListSchema.extend({
      reportType: z
        .enum(['competition', 'monthly_audit', 'brand_strategy', 'news', 'general'])
        .optional(),
    }),
  ),
  async (c) => {
    const q = c.req.valid('query');
    const where: Prisma.ReportWhereInput = {};
    if (q.userId) where.userId = q.userId;
    if (q.projectId) where.projectId = q.projectId;
    if (q.reportType) where.reportType = q.reportType;
    if (q.q) where.title = { contains: q.q, mode: 'insensitive' };

    const [total, rows] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { user: { select: { id: true, email: true } } },
      }),
    ]);

    return c.json(paginated(rows, buildPageMeta(q.page, q.pageSize, total)));
  },
);

moderationAdminRouter.delete('/reports/:id', async (c) => {
  const id = c.req.param('id');
  const before = await prisma.report.findUnique({ where: { id } });
  if (!before) throw new NotFound('No encontrado');
  await prisma.report.delete({ where: { id } });
  await logAudit(c, {
    action: 'report.delete',
    targetType: 'report',
    targetId: id,
    diff: { title: before.title, userId: before.userId },
  });
  return c.json(ok({ deleted: true }));
});
