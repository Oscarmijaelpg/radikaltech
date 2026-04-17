import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { Forbidden, NotFound } from '../../lib/errors.js';

const listQuerySchema = z.object({
  unread_only: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const notificationsRouter = new Hono<{ Variables: AuthVariables }>();

notificationsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { unread_only, limit } = c.req.valid('query');
  const items = await prisma.notification.findMany({
    where: { userId: user.id, ...(unread_only ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit ?? 30,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });
  return c.json(ok({ items, unread_count: unreadCount }));
});

notificationsRouter.patch('/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) throw new NotFound('Notification not found');
  if (n.userId !== user.id) throw new Forbidden();
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return c.json(ok(updated));
});

notificationsRouter.post('/mark-all-read', async (c) => {
  const user = c.get('user');
  const res = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return c.json(ok({ updated: res.count }));
});

notificationsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) throw new NotFound('Notification not found');
  if (n.userId !== user.id) throw new Forbidden();
  await prisma.notification.delete({ where: { id } });
  return c.json(ok({ deleted: true }));
});
