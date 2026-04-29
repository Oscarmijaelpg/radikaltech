import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { NotFound, Conflict } from '../../lib/errors.js';
import { logAudit } from './audit-service.js';

export const flagsAdminRouter = new Hono<{ Variables: AuthVariables }>();

flagsAdminRouter.get('/', async (c) => {
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  return c.json(ok(flags));
});

const createSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/i, 'solo [a-z0-9_-]'),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(false),
});

flagsAdminRouter.post('/', zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json');
  const existing = await prisma.featureFlag.findUnique({ where: { key: body.key } });
  if (existing) throw new Conflict('Ya existe un flag con esa key');

  const flag = await prisma.featureFlag.create({
    data: { key: body.key, description: body.description, enabled: body.enabled },
  });

  await logAudit(c, {
    action: 'flag.create',
    targetType: 'feature_flag',
    targetId: flag.id,
    diff: { key: flag.key, enabled: flag.enabled },
  });

  return c.json(ok(flag));
});

const updateSchema = z.object({
  description: z.string().max(500).nullable().optional(),
  enabled: z.boolean().optional(),
  userOverrides: z.record(z.boolean()).optional(),
});

flagsAdminRouter.patch('/:key', zValidator('json', updateSchema), async (c) => {
  const key = c.req.param('key');
  const before = await prisma.featureFlag.findUnique({ where: { key } });
  if (!before) throw new NotFound('Flag no encontrado');

  const flag = await prisma.featureFlag.update({
    where: { key },
    data: {
      ...(c.req.valid('json').description !== undefined
        ? { description: c.req.valid('json').description }
        : {}),
      ...(c.req.valid('json').enabled !== undefined
        ? { enabled: c.req.valid('json').enabled }
        : {}),
      ...(c.req.valid('json').userOverrides !== undefined
        ? { userOverrides: c.req.valid('json').userOverrides }
        : {}),
    },
  });

  await logAudit(c, {
    action: 'flag.update',
    targetType: 'feature_flag',
    targetId: flag.id,
    diff: {
      before: { enabled: before.enabled, description: before.description },
      after: c.req.valid('json'),
    },
  });

  return c.json(ok(flag));
});

flagsAdminRouter.delete('/:key', async (c) => {
  const key = c.req.param('key');
  const before = await prisma.featureFlag.findUnique({ where: { key } });
  if (!before) throw new NotFound('Flag no encontrado');
  await prisma.featureFlag.delete({ where: { key } });
  await logAudit(c, {
    action: 'flag.delete',
    targetType: 'feature_flag',
    targetId: before.id,
    diff: { key: before.key, enabled: before.enabled },
  });
  return c.json(ok({ deleted: true }));
});
