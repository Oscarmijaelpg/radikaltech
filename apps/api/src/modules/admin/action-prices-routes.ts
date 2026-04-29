import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { NotFound, Conflict } from '../../lib/errors.js';
import { logAudit } from './audit-service.js';

export const actionPricesAdminRouter = new Hono<{ Variables: AuthVariables }>();

actionPricesAdminRouter.get('/', async (c) => {
  const rows = await prisma.actionPrice.findMany({ orderBy: { key: 'asc' } });
  return c.json(ok(rows));
});

const createSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_.]+$/i, 'solo [a-z0-9_.]'),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  monedas: z.number().int().nonnegative(),
  enabled: z.boolean().default(true),
});

actionPricesAdminRouter.post('/', zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json');
  const existing = await prisma.actionPrice.findUnique({ where: { key: body.key } });
  if (existing) throw new Conflict('Ya existe una acción con esa key');
  const price = await prisma.actionPrice.create({ data: body });
  await logAudit(c, {
    action: 'action_price.create',
    targetType: 'action_price',
    targetId: price.key,
    diff: { key: price.key, monedas: price.monedas },
  });
  return c.json(ok(price));
});

const patchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  monedas: z.number().int().nonnegative().optional(),
  enabled: z.boolean().optional(),
});

actionPricesAdminRouter.patch('/:key', zValidator('json', patchSchema), async (c) => {
  const key = c.req.param('key');
  const body = c.req.valid('json');
  const before = await prisma.actionPrice.findUnique({ where: { key } });
  if (!before) throw new NotFound('Acción no encontrada');

  const price = await prisma.actionPrice.update({
    where: { key },
    data: {
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.monedas !== undefined ? { monedas: body.monedas } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    },
  });

  await logAudit(c, {
    action: 'action_price.update',
    targetType: 'action_price',
    targetId: key,
    diff: {
      before: { monedas: before.monedas, enabled: before.enabled },
      after: body,
    },
  });

  return c.json(ok(price));
});

actionPricesAdminRouter.delete('/:key', async (c) => {
  const key = c.req.param('key');
  const before = await prisma.actionPrice.findUnique({ where: { key } });
  if (!before) throw new NotFound('Acción no encontrada');
  await prisma.actionPrice.delete({ where: { key } });
  await logAudit(c, {
    action: 'action_price.delete',
    targetType: 'action_price',
    targetId: key,
    diff: { monedas: before.monedas },
  });
  return c.json(ok({ deleted: true }));
});
