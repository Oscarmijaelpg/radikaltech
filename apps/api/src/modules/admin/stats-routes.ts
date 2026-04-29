import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';

export const statsRouter = new Hono<{ Variables: AuthVariables }>();

const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function parseRange(q: { from?: string; to?: string }, defaultDays = 30) {
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from
    ? new Date(q.from)
    : new Date(to.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  return { from, to };
}

statsRouter.get('/overview', async (c) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers24h,
    newUsers7d,
    onboardedUsers,
    totalProjects,
    jobsRunning,
    jobsFailed24h,
    jobsSucceeded24h,
    tokenAgg,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.profile.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.profile.count({ where: { onboardingCompleted: true } }),
    prisma.project.count(),
    prisma.aiJob.count({ where: { status: 'running' } }),
    prisma.aiJob.count({ where: { status: 'failed', createdAt: { gte: dayAgo } } }),
    prisma.aiJob.count({ where: { status: 'succeeded', createdAt: { gte: dayAgo } } }),
    prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: monthAgo } },
      _sum: { promptTokens: true, completionTokens: true, costUsd: true },
    }),
  ]);

  return c.json(
    ok({
      users: { total: totalUsers, new24h: newUsers24h, new7d: newUsers7d, onboarded: onboardedUsers },
      projects: { total: totalProjects },
      jobs: { running: jobsRunning, failed24h: jobsFailed24h, succeeded24h: jobsSucceeded24h },
      tokenUsage30d: {
        promptTokens: tokenAgg._sum.promptTokens ?? 0,
        completionTokens: tokenAgg._sum.completionTokens ?? 0,
        costUsd: Number(tokenAgg._sum.costUsd ?? 0),
      },
    }),
  );
});

statsRouter.get('/signups', zValidator('query', rangeSchema), async (c) => {
  const { from, to } = parseRange(c.req.valid('query'));
  const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
    SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count
    FROM profiles
    WHERE created_at >= ${from} AND created_at <= ${to}
    GROUP BY day
    ORDER BY day ASC
  `;
  return c.json(
    ok(rows.map((r) => ({ date: r.day.toISOString(), count: Number(r.count) }))),
  );
});

statsRouter.get(
  '/token-usage',
  zValidator(
    'query',
    rangeSchema.extend({ provider: z.string().optional(), model: z.string().optional() }),
  ),
  async (c) => {
    const q = c.req.valid('query');
    const { from, to } = parseRange(q);

    const rows = await prisma.tokenUsage.groupBy({
      by: ['provider', 'model'],
      where: {
        createdAt: { gte: from, lte: to },
        ...(q.provider ? { provider: q.provider } : {}),
        ...(q.model ? { model: q.model } : {}),
      },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true, costUsd: true },
      _count: { _all: true },
    });

    return c.json(
      ok(
        rows.map((r) => ({
          provider: r.provider,
          model: r.model,
          calls: r._count._all,
          promptTokens: r._sum.promptTokens ?? 0,
          completionTokens: r._sum.completionTokens ?? 0,
          totalTokens: r._sum.totalTokens ?? 0,
          costUsd: Number(r._sum.costUsd ?? 0),
        })),
      ),
    );
  },
);

statsRouter.get(
  '/jobs-trend',
  zValidator(
    'query',
    rangeSchema.extend({
      status: z.enum(['queued', 'running', 'succeeded', 'failed']).optional(),
      kind: z.string().optional(),
    }),
  ),
  async (c) => {
    const q = c.req.valid('query');
    const { from, to } = parseRange(q);

    const conditions: Prisma.Sql[] = [
      Prisma.sql`created_at >= ${from}`,
      Prisma.sql`created_at <= ${to}`,
    ];
    if (q.status) conditions.push(Prisma.sql`status = ${q.status}::ai_job_status`);
    if (q.kind) conditions.push(Prisma.sql`kind = ${q.kind}`);

    const rows = await prisma.$queryRaw<
      Array<{ day: Date; status: string; count: bigint }>
    >`
      SELECT date_trunc('day', created_at) AS day, status, COUNT(*) AS count
      FROM ai_jobs
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY day, status
      ORDER BY day ASC
    `;

    return c.json(
      ok(
        rows.map((r) => ({
          date: r.day.toISOString(),
          status: r.status,
          count: Number(r.count),
        })),
      ),
    );
  },
);
