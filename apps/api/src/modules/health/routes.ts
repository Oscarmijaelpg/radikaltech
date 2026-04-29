import { Hono } from 'hono';
import { prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';

export const healthRouter = new Hono();

healthRouter.get('/', async (c) => {
  let dbStatus: 'connected' | 'error' = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    logger.error({ err }, 'health db check failed');
    dbStatus = 'error';
  }
  return c.json({ status: 'ok', db: dbStatus, timestamp: new Date().toISOString() });
});
