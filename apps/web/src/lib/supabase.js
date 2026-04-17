import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
    console.error('[supabase] faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}
// Limpieza defensiva: si hubo una pestaña previa con lock atascado, borramos cualquier
// sb-*-auth-lock en localStorage para evitar que getSession quede colgado.
if (typeof window !== 'undefined') {
    try {
        Object.keys(localStorage).forEach((k) => {
            if (k.includes('-auth-lock') || k.endsWith('-auth-token-code-verifier')) {
                localStorage.removeItem(k);
            }
        });
    }
    catch { }
}
export const supabase = createClient(url, key, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'radikal-auth',
        flowType: 'pkce',
        // Desactivar locks de navigator.locks: es la causa más común de getSession() colgado
        // cuando hay tabs antiguas o el storage quedó en estado inconsistente.
        lock: async (_name, _acquireTimeout, fn) => fn(),
    },
});
