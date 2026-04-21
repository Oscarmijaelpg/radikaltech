import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';

export const providersAdminRouter = new Hono<{ Variables: AuthVariables }>();

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

providersAdminRouter.get('/overview', zValidator('query', rangeSchema), async (c) => {
  const { from, to } = parseRange(c.req.valid('query'));

  const tokenRows = await prisma.tokenUsage.groupBy({
    by: ['provider'],
    where: { createdAt: { gte: from, lte: to } },
    _sum: { promptTokens: true, completionTokens: true, totalTokens: true, costUsd: true },
    _count: { _all: true },
  });

  return c.json(
    ok(
      tokenRows.map((r) => ({
        provider: r.provider,
        calls: r._count._all,
        promptTokens: r._sum.promptTokens ?? 0,
        completionTokens: r._sum.completionTokens ?? 0,
        totalTokens: r._sum.totalTokens ?? 0,
        costUsd: Number(r._sum.costUsd ?? 0),
      })),
    ),
  );
});

providersAdminRouter.get('/failures', zValidator('query', rangeSchema), async (c) => {
  const { from, to } = parseRange(c.req.valid('query'));

  const failedJobs = await prisma.aiJob.findMany({
    where: { status: 'failed', createdAt: { gte: from, lte: to } },
    select: { kind: true, error: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const byKind = new Map<string, number>();
  for (const j of failedJobs) byKind.set(j.kind, (byKind.get(j.kind) ?? 0) + 1);

  const byProviderHint = new Map<string, number>();
  const hints = ['openai', 'openrouter', 'gemini', 'firecrawl', 'apify', 'tavily', 'supabase'];
  for (const j of failedJobs) {
    const msg = (j.error ?? '').toLowerCase();
    const hit = hints.find((h) => msg.includes(h));
    const key = hit ?? 'unknown';
    byProviderHint.set(key, (byProviderHint.get(key) ?? 0) + 1);
  }

  return c.json(
    ok({
      total: failedJobs.length,
      byKind: Array.from(byKind.entries()).map(([kind, count]) => ({ kind, count })),
      byProviderHint: Array.from(byProviderHint.entries()).map(([provider, count]) => ({
        provider,
        count,
      })),
      recent: failedJobs.slice(0, 50),
    }),
  );
});
