import { cors } from 'hono/cors';
import { env } from '../config/env.js';

const LOCALHOST_RE = /^http:\/\/localhost:\d+$/;
// Quick Tunnels de Cloudflare (subdominios generados al levantar cloudflared)
// para exponer el dev server a testers externos.
const CLOUDFLARE_TUNNEL_RE = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;

// WEB_URL puede ser una lista separada por comas (ej. para permitir web + admin).
const ALLOWED_ORIGINS = (env.WEB_URL ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function resolveOrigin(origin: string): string | null {
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (LOCALHOST_RE.test(origin)) return origin;
  if (CLOUDFLARE_TUNNEL_RE.test(origin)) return origin;
  return null;
}

export const corsMiddleware = cors({
  origin: (origin) => resolveOrigin(origin),
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 600,
});
