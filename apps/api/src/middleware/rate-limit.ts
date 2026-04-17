import type { Context, MiddlewareHandler } from 'hono';
import type { AuthVariables } from './auth.js';

/**
 * Token bucket / fixed-window rate limiter en memoria.
 * Suficiente para dev. En prod se movería a Redis (p.ej. ioredis + INCR + EXPIRE).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// GC periódico para que el Map no crezca indefinidamente
let gcTimer: ReturnType<typeof setInterval> | null = null;
function ensureGc() {
  if (gcTimer) return;
  gcTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }, 60_000);
  // No bloquear el event loop al cerrar el proceso
  if (typeof (gcTimer as { unref?: () => void }).unref === 'function') {
    (gcTimer as { unref: () => void }).unref();
  }
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /**
   * Deriva la clave para el bucket. Por defecto usa userId del auth context.
   * Se prefija automáticamente con la ruta para aislar límites por endpoint.
   */
  key?: (c: Context<{ Variables: AuthVariables }>) => string;
  /** Prefijo/nombre del límite (por defecto la ruta). */
  name?: string;
}

export function createRateLimiter(
  options: RateLimitOptions,
): MiddlewareHandler<{ Variables: AuthVariables }> {
  ensureGc();
  const { windowMs, max } = options;
  return async (c, next) => {
    const base =
      options.key?.(c) ??
      (() => {
        const user = c.get('user');
        return user?.id ?? c.req.header('x-forwarded-for') ?? 'anon';
      })();
    const prefix = options.name ?? c.req.path;
    const bucketKey = `${prefix}:${base}`;
    const now = Date.now();
    const existing = buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      c.header('Retry-After', String(retryAfter));
      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil(existing.resetAt / 1000)));
      return c.json(
        {
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Demasiadas solicitudes. Intenta en ${retryAfter}s.`,
            retry_after: retryAfter,
          },
        },
        429,
      );
    }

    existing.count += 1;
    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - existing.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(existing.resetAt / 1000)));
    return next();
  };
}

/** Presets para las rutas de ai-services. */
export const aiRateLimits = {
  generateImage: createRateLimiter({ windowMs: 5 * 60_000, max: 10, name: 'ai:generate-image' }),
  analyzeBrand: createRateLimiter({ windowMs: 15 * 60_000, max: 3, name: 'ai:analyze-brand' }),
  aggregateNews: createRateLimiter({ windowMs: 10 * 60_000, max: 20, name: 'ai:aggregate-news' }),
  default: (name: string) =>
    createRateLimiter({ windowMs: 5 * 60_000, max: 30, name: `ai:${name}` }),
};
