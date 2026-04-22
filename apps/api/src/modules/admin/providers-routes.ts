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
  const whereBase = { status: 'failed' as const, createdAt: { gte: from, lte: to } };

  const [total, byKindGroups, recent, errorRows] = await Promise.all([
    prisma.aiJob.count({ where: whereBase }),
    prisma.aiJob.groupBy({
      by: ['kind'],
      where: whereBase,
      _count: { _all: true },
    }),
    prisma.aiJob.findMany({
      where: whereBase,
      select: { id: true, kind: true, error: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.aiJob.findMany({
      where: { ...whereBase, NOT: { error: null } },
      select: { error: true },
      take: 1000,
    }),
  ]);

  const byKind = byKindGroups
    .map((g) => ({ kind: g.kind, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  const hints = ['openai', 'openrouter', 'gemini', 'firecrawl', 'apify', 'tavily', 'supabase'];
  const byProviderHintMap = new Map<string, number>();
  for (const row of errorRows) {
    const msg = (row.error ?? '').toLowerCase();
    const key = hints.find((h) => msg.includes(h)) ?? 'unknown';
    byProviderHintMap.set(key, (byProviderHintMap.get(key) ?? 0) + 1);
  }
  const byProviderHint = Array.from(byProviderHintMap.entries())
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count);

  return c.json(
    ok({
      total,
      byKind,
      byProviderHint,
      recent: recent.map((r) => ({
        id: r.id,
        kind: r.kind,
        error: r.error,
        createdAt: r.createdAt.toISOString(),
      })),
    }),
  );
});
