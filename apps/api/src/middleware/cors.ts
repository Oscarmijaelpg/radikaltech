import { cors } from 'hono/cors';
import { env } from '../config/env.js';

const isDev = env.NODE_ENV !== 'production';
const LOCALHOST_RE = /^http:\/\/localhost:\d+$/;

function resolveOrigin(origin: string): string | null {
  if (origin === env.WEB_URL) return origin;
  if (LOCALHOST_RE.test(origin)) return origin;
  return null;
}

export const corsMiddleware = cors({
  origin: (origin) => resolveOrigin(origin),
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 600,
});
