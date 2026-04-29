import { prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';

const ZOMBIE_TIMEOUT_MS = 30 * 60_000;   // 30 min — cubre 4 iteraciones Kimi × ~5 min
const CLEANUP_INTERVAL_MS = 5 * 60_000;

export async function markStartupZombies(): Promise<void> {
  try {
    const result = await prisma.aiJob.updateMany({
      where: { status: { in: ['queued', 'running'] } },
      data: {
        status: 'failed',
        error: 'Job abortado: el proceso que lo creó ya no existe (startup cleanup)',
        finishedAt: new Date(),
      },
    });
    if (result.count > 0) {
      logger.info({ count: result.count }, 'startup zombie cleanup');
    }
  } catch (err) {
    logger.error({ err }, 'startup zombie cleanup failed');
  }
}

export function startZombieCleanupLoop(): void {
  setInterval(async () => {
    try {
      const threshold = new Date(Date.now() - ZOMBIE_TIMEOUT_MS);
      const result = await prisma.aiJob.updateMany({
        where: {
          status: 'running',
          OR: [
            { startedAt: { lt: threshold } },
            { startedAt: null, createdAt: { lt: threshold } },
          ],
        },
        data: {
          status: 'failed',
          error: 'Job abortado: running > 30 min sin completar',
          finishedAt: new Date(),
        },
      });
      if (result.count > 0) {
        logger.warn({ count: result.count }, 'periodic zombie cleanup');
      }
    } catch (err) {
      logger.error({ err }, 'periodic zombie cleanup failed');
    }
  }, CLEANUP_INTERVAL_MS);
  logger.info({ intervalMs: CLEANUP_INTERVAL_MS, timeoutMs: ZOMBIE_TIMEOUT_MS }, 'zombie cleanup loop started');
}
