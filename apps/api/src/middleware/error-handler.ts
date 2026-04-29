import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

type ErrorBody = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
  request_id?: string;
};

type ClientErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429;
type ServerErrorStatus = 500 | 502 | 503 | 504;
type ErrorStatus = ClientErrorStatus | ServerErrorStatus;

function coerceStatus(s: number): ErrorStatus {
  const allowed: ErrorStatus[] = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];
  return (allowed.find((x) => x === s) ?? 500) as ErrorStatus;
}

export const errorHandler: ErrorHandler = (err, c) => {
  const request_id = (c.get('request_id') as string | undefined) ?? undefined;
  const isProd = env.NODE_ENV === 'production';

  if (err instanceof ZodError) {
    logger.warn({ request_id, issues: err.issues }, 'validation error');
    const body: ErrorBody = {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.issues },
      request_id,
    };
    return c.json(body, 400);
  }

  if (err instanceof AppError) {
    logger.warn(
      { request_id, code: err.code, status: err.status, msg: err.message },
      'app error',
    );
    const body: ErrorBody = {
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
      request_id,
    };
    return c.json(body, coerceStatus(err.status));
  }

  if (err instanceof HTTPException) {
    logger.warn({ request_id, status: err.status, msg: err.message }, 'http exception');
    const res = err.getResponse();
    if (res) return res;
    const body: ErrorBody = {
      ok: false,
      error: { code: 'HTTP_ERROR', message: err.message },
      request_id,
    };
    return c.json(body, coerceStatus(err.status));
  }

  logger.error({ request_id, err }, 'unhandled error');
  const body: ErrorBody = {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      // Only expose stack in non-production
      ...(isProd ? {} : { details: err instanceof Error ? { stack: err.stack } : err }),
    },
    request_id,
  };
  return c.json(body, 500);
};
