import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  console.error('[supabase] faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

if (typeof window !== 'undefined') {
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.includes('-auth-lock') || k.endsWith('-auth-token-code-verifier')) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'radikal-admin-auth',
    flowType: 'pkce',
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
