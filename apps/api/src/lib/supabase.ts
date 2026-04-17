import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { Unauthorized } from './errors.js';

export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const supabaseAnon: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export interface AuthUser {
  id: string;
  email: string | null;
  role: string;
}

export async function getUserFromToken(token: string): Promise<AuthUser> {
  if (!token) throw new Unauthorized('Missing token');
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new Unauthorized(error?.message ?? 'Invalid token');
  }
  const u = data.user;
  const role =
    (u.app_metadata as Record<string, unknown> | undefined)?.['role'] === 'admin'
      ? 'admin'
      : 'user';
  return { id: u.id, email: u.email ?? null, role };
}
