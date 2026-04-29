import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { logger } from '../lib/logger.js';

export interface RequestLoggerVariables {
  request_id: string;
}

export const loggerMiddleware: MiddlewareHandler<{ Variables: RequestLoggerVariables }> = async (
  c,
  next,
) => {
  const start = Date.now();
  const { method } = c.req;
  const path = c.req.path;
  const request_id = c.req.header('x-request-id') ?? randomUUID();
  c.set('request_id', request_id);
  c.res.headers.set('x-request-id', request_id);
  await next();
  const elapsed = Date.now() - start;
  logger.info({ request_id, method, path, status: c.res.status, elapsed }, 'request');
};
