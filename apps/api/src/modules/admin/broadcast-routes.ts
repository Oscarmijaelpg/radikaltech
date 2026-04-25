import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma, Prisma } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { BadRequest } from '../../lib/errors.js';
import { logAudit } from './audit-service.js';

export const broadcastAdminRouter = new Hono<{ Variables: AuthVariables }>();

const broadcastSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  actionUrl: z.string().url().optional(),
  kind: z.string().default('admin_broadcast'),
  segment: z.enum(['all', 'onboarded', 'not_onboarded', 'user_ids']),
  userIds: z.array(z.string().uuid()).optional(),
  preview: z.boolean().default(false),
});

async function resolveRecipients(
  segment: 'all' | 'onboarded' | 'not_onboarded' | 'user_ids',
  userIds?: string[],
): Promise<string[]> {
  if (segment === 'user_ids') {
    if (!userIds || userIds.length === 0) {
      throw new BadRequest('Debes pasar al menos un userId');
    }
    return userIds;
  }
  const where: Prisma.ProfileWhereInput = {};
  if (segment === 'onboarded') where.onboardingCompleted = true;
  if (segment === 'not_onboarded') where.onboardingCompleted = false;
  const profiles = await prisma.profile.findMany({ where, select: { id: true } });
  return profiles.map((p) => p.id);
}

broadcastAdminRouter.post('/notifications', zValidator('json', broadcastSchema), async (c) => {
  const body = c.req.valid('json');
  const recipients = await resolveRecipients(body.segment, body.userIds);

  if (body.preview) {
    return c.json(
      ok({
        preview: true,
        recipientCount: recipients.length,
        warning:
          recipients.length === 0
            ? 'No hay destinatarios en el segmento seleccionado.'
            : undefined,
      }),
    );
  }

  if (recipients.length === 0) {
    throw new BadRequest('No hay destinatarios en el segmento');
  }

  const batchSize = 500;
  let created = 0;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const chunk = recipients.slice(i, i + batchSize);
    const res = await prisma.notification.createMany({
      data: chunk.map((userId) => ({
        userId,
        kind: body.kind,
        title: body.title,
        body: body.body ?? null,
        actionUrl: body.actionUrl ?? null,
      })),
    });
    created += res.count;
  }

  await logAudit(c, {
    action: 'broadcast.send',
    targetType: 'notification',
    metadata: { segment: body.segment, created, title: body.title },
  });

  return c.json(ok({ created, recipientCount: recipients.length }));
});
