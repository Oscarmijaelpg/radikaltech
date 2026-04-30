import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { assertProjectOwner } from '../../lib/guards.js';
import {
  generateBrandStrategy,
  generateMonthlyAudit,
  generateCompetitionReport,
  generateUnifiedReport,
} from './generators/index.js';

const REPORT_TYPES = ['competition', 'monthly_audit', 'brand_strategy', 'news', 'general'] as const;

const listQuerySchema = z.object({
  project_id: z.string().uuid(),
  type: z.enum(REPORT_TYPES).optional(),
});

const createSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  report_type: z.enum(REPORT_TYPES),
  content: z.string().optional(),
  summary: z.string().optional(),
  key_insights: z.array(z.string()).optional(),
  source_data: z.unknown().optional(),
});

async function assertReportOwner(id: string, userId: string) {
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) throw new NotFound('Report not found');
  if (r.userId !== userId) throw new Forbidden();
  return r;
}

export const reportsRouter = new Hono<{ Variables: AuthVariables }>();

reportsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id, type } = c.req.valid('query');
  await assertProjectOwner(project_id, user.id);
  const items = await prisma.report.findMany({
    where: { projectId: project_id, ...(type ? { reportType: type } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(ok(items));
});

reportsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const r = await assertReportOwner(c.req.param('id'), user.id);
  return c.json(ok(r));
});

reportsRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  await assertProjectOwner(body.project_id, user.id);
  const created = await prisma.report.create({
    data: {
      projectId: body.project_id,
      userId: user.id,
      title: body.title,
      reportType: body.report_type,
      content: body.content,
      summary: body.summary,
      keyInsights: body.key_insights ?? [],
      sourceData: (body.source_data as object | undefined) ?? undefined,
    },
  });
  return c.json(ok(created), 201);
});

const generateBrandSchema = z.object({ project_id: z.string().uuid() });
const generateAuditSchema = z.object({ project_id: z.string().uuid() });
const generateCompetitionSchema = z.object({
  project_id: z.string().uuid(),
  competitor_id: z.string().uuid(),
});

reportsRouter.post(
  '/generate/brand-strategy',
  zValidator('json', generateBrandSchema),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');
    await assertProjectOwner(project_id, user.id);
    const report = await generateBrandStrategy({ userId: user.id, projectId: project_id });
    return c.json(ok(report), 201);
  },
);

reportsRouter.post(
  '/generate/monthly-audit',
  zValidator('json', generateAuditSchema),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');
    await assertProjectOwner(project_id, user.id);
    const report = await generateMonthlyAudit({ userId: user.id, projectId: project_id });
    return c.json(ok(report), 201);
  },
);

reportsRouter.post(
  '/generate/competition',
  zValidator('json', generateCompetitionSchema),
  async (c) => {
    const user = c.get('user');
    const { project_id, competitor_id } = c.req.valid('json');
    await assertProjectOwner(project_id, user.id);
    try {
      const report = await generateCompetitionReport({
        userId: user.id,
        projectId: project_id,
        competitorId: competitor_id,
      });
      return c.json(ok(report), 201);
    } catch (err) {
      throw new BadRequest(err instanceof Error ? err.message : 'Failed to generate report');
    }
  },
);

const generateUnifiedSchema = z.object({ project_id: z.string().uuid() });

reportsRouter.post(
  '/generate/unified',
  zValidator('json', generateUnifiedSchema),
  async (c) => {
    const user = c.get('user');
    const { project_id } = c.req.valid('json');
    await assertProjectOwner(project_id, user.id);
    const report = await generateUnifiedReport({ userId: user.id, projectId: project_id });
    return c.json(ok(report), 201);
  },
);

reportsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  await assertReportOwner(c.req.param('id'), user.id);
  await prisma.report.delete({ where: { id: c.req.param('id') } });
  return c.json(ok({ deleted: true }));
});
