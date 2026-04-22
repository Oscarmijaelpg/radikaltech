import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { creditService } from './service.js';

export const creditsRouter = new Hono<{ Variables: AuthVariables }>();

creditsRouter.get('/me', async (c) => {
  const user = c.get('user');
  const balance = await creditService.getBalance(user.id);
  return c.json(ok({ balance }));
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

creditsRouter.get('/history', zValidator('query', historyQuerySchema), async (c) => {
  const user = c.get('user');
  const q = c.req.valid('query');
  const transactions = await creditService.listTransactions(user.id, { limit: q.limit });
  return c.json(ok(transactions));
});

// Lista pública (cualquier user logueado) de precios para que el frontend pueda
// mostrar costos en la UI y pedir confirmación pre-acción.
creditsRouter.get('/prices', async (c) => {
  const prices = await prisma.actionPrice.findMany({
    where: { enabled: true },
    orderBy: { monedas: 'asc' },
    select: { key: true, label: true, description: true, monedas: true },
  });
  return c.json(ok(prices));
});
