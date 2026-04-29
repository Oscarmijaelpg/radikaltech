import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok, paginated, buildPageMeta } from '../../lib/response.js';
import { NotFound, BadRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { websiteAnalyzer, competitorAnalyzer, brandOrchestrator } from '../ai-services/index.js';
import { logAudit } from './audit-service.js';

export const projectsAdminRouter = new Hono<{ Variables: AuthVariables }>();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  userId: z.string().uuid().optional(),
  industry: z.string().optional(),
});

projectsAdminRouter.get('/', zValidator('query', listSchema), async (c) => {
  const q = c.req.valid('query');
  const where: Prisma.ProjectWhereInput = {};
  if (q.q) {
    where.OR = [
      { name: { contains: q.q, mode: 'insensitive' } },
      { companyName: { contains: q.q, mode: 'insensitive' } },
      { websiteUrl: { contains: q.q, mode: 'insensitive' } },
    ];
  }
  if (q.userId) where.userId = q.userId;
  if (q.industry) where.industry = q.industry;

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        contentAssets: {
          where: { tags: { has: 'logo' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { assetUrl: true },
        },
      },
    }),
  ]);

  const withLogo = rows.map((r) => {
    const { contentAssets, ...rest } = r;
    return { ...rest, logoUrl: contentAssets[0]?.assetUrl ?? null };
  });

  return c.json(paginated(withLogo, buildPageMeta(q.page, q.pageSize, total)));
});

projectsAdminRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
      socialAccounts: true,
      brandProfile: true,
      objectives: true,
      competitors: true,
      _count: {
        select: {
          chats: true,
          contentAssets: true,
          reports: true,
          memories: true,
          aiJobs: true,
        },
      },
    },
  });
  if (!project) throw new NotFound('Proyecto no encontrado');

  const logoAsset = await prisma.contentAsset.findFirst({
    where: { projectId: id, tags: { has: 'logo' } },
    orderBy: { createdAt: 'desc' },
    select: { assetUrl: true },
  });

  return c.json(ok({ ...project, logoUrl: logoAsset?.assetUrl ?? null }));
});

projectsAdminRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const before = await prisma.project.findUnique({ where: { id } });
  if (!before) throw new NotFound('Proyecto no encontrado');

  await prisma.project.delete({ where: { id } });

  await logAudit(c, {
    action: 'project.delete',
    targetType: 'project',
    targetId: id,
    diff: { name: before.name, userId: before.userId },
  });

  return c.json(ok({ deleted: true }));
});

const reanalyzeSchema = z.object({
  kind: z.enum(['website', 'competitors', 'brand']),
});

projectsAdminRouter.post('/:id/reanalyze', zValidator('json', reanalyzeSchema), async (c) => {
  const id = c.req.param('id');
  const { kind } = c.req.valid('json');
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new NotFound('Proyecto no encontrado');

  if (kind === 'website' && !project.websiteUrl) {
    throw new BadRequest('El proyecto no tiene websiteUrl');
  }
  if (kind === 'competitors' && !project.companyName && !project.websiteUrl) {
    throw new BadRequest('El proyecto no tiene companyName ni websiteUrl para buscar competidores');
  }

  void (async () => {
    try {
      if (kind === 'website') {
        await websiteAnalyzer.analyze({
          url: project.websiteUrl!,
          userId: project.userId,
          projectId: project.id,
        });
      } else if (kind === 'competitors') {
        await competitorAnalyzer.analyze({
          query: project.companyName ?? project.websiteUrl!,
          userId: project.userId,
          projectId: project.id,
        });
      } else if (kind === 'brand') {
        await brandOrchestrator.analyze({
          projectId: project.id,
          userId: project.userId,
        });
      }
    } catch (err) {
      logger.warn({ err, kind, projectId: id }, '[admin] reanalyze failed');
    }
  })();

  await logAudit(c, {
    action: `project.reanalyze.${kind}`,
    targetType: 'project',
    targetId: id,
    metadata: { kind, userId: project.userId },
  });

  return c.json(ok({ queued: true, kind }));
});
