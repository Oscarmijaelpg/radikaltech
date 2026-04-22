import { prisma } from '@radikal/db';
import type { Context } from 'hono';
import type { AuthVariables } from '../../middleware/auth.js';
import { logger } from '../../lib/logger.js';

export interface AuditParams {
  action: string;
  targetType: string;
  targetId?: string | null;
  diff?: unknown;
  metadata?: unknown;
}

export async function logAudit(
  c: Context<{ Variables: AuthVariables }>,
  params: AuditParams,
): Promise<void> {
  const user = c.get('user');
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        diff: (params.diff as object | null) ?? undefined,
        metadata: (params.metadata as object | null) ?? undefined,
        ip: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
        userAgent: c.req.header('user-agent') ?? null,
      },
    });
  } catch (err) {
    // Registrar en nivel error (no warn) para que entre en alertas de monitoring.
    // Intencionalmente no re-lanzamos: una operación admin no debe fallar si el audit log
    // está caído, porque dejaría estado inconsistente (ej. DELETE user de Supabase Auth OK
    // pero profile sin tocar). Si se necesita garantía fuerte, mover a un outbox pattern.
    logger.error(
      { err, action: params.action, actorId: user.id, targetId: params.targetId },
      '[admin] audit log write failed — operation proceeded without audit trail',
    );
  }
}
