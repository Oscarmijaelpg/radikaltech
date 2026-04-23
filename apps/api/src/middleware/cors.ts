import { cors } from 'hono/cors';
import { env } from '../config/env.js';

const LOCALHOST_RE = /^http:\/\/localhost:\d+$/;
// Quick Tunnels de Cloudflare (subdominios generados al levantar cloudflared)
// para exponer el dev server a testers externos.
const CLOUDFLARE_TUNNEL_RE = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;

function resolveOrigin(origin: string): string | null {
  if (origin === env.WEB_URL) return origin;
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
