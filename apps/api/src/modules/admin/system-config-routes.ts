import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { logAudit } from './audit-service.js';

export const systemConfigAdminRouter = new Hono<{ Variables: AuthVariables }>();

systemConfigAdminRouter.get('/', async (c) => {
  const rows = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  return c.json(ok(rows));
});

const upsertSchema = z.object({
  value: z.unknown(),
});

systemConfigAdminRouter.put('/:key', zValidator('json', upsertSchema), async (c) => {
  const key = c.req.param('key');
  const body = c.req.valid('json');
  const before = await prisma.systemConfig.findUnique({ where: { key } });

  const value = body.value as Prisma.InputJsonValue;
  const entry = await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  await logAudit(c, {
    action: 'system_config.upsert',
    targetType: 'system_config',
    targetId: key,
    diff: { before: before?.value ?? null, after: body.value },
  });

  return c.json(ok(entry));
});
