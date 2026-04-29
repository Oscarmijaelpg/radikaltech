import type { MiddlewareHandler } from 'hono';
import { getUserFromToken, type AuthUser } from '../lib/supabase.js';
import { Forbidden, Unauthorized } from '../lib/errors.js';

export type AuthVariables = {
  user: AuthUser;
  request_id?: string;
};

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const token = extractBearer(c.req.header('Authorization'));
  if (!token) throw new Unauthorized('Missing bearer token');
  const user = await getUserFromToken(token);
  c.set('user', user);
  await next();
};

export const requireAdmin: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const user = c.get('user');
  if (!user) throw new Unauthorized();
  if (user.role !== 'admin') throw new Forbidden('Admin required');
  await next();
};
