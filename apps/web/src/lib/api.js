import { supabase } from './supabase';
const API_URL = import.meta.env.VITE_API_URL || '/api';
// Cache del token: se actualiza desde AuthProvider cada vez que cambia la sesión.
// Evita llamar a supabase.auth.getSession() en cada request (esa llamada se cuelga
// intermitentemente cuando hay otra operación de auth en curso).
let cachedToken = null;
export function setAuthToken(token) {
    cachedToken = token;
}
export function getAuthToken() {
    return cachedToken;
}
async function resolveToken() {
    if (cachedToken)
        return cachedToken;
    // Fallback: si aún no tenemos el token cacheado, intentamos una vez con un timeout corto
    try {
        const result = await Promise.race([
            supabase.auth.getSession(),
            new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 1500)),
        ]);
        const token = result.data.session?.access_token ?? null;
        if (token)
            cachedToken = token;
        return token;
    }
    catch {
        return null;
    }
}
export async function apiRequest(path, opts = {}) {
    const token = await resolveToken();
    const headers = new Headers(opts.headers);
    headers.set('Content-Type', 'application/json');
    if (token)
        headers.set('Authorization', `Bearer ${token}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    console.log('[api] →', opts.method ?? 'GET', path, { hasToken: !!token });
    try {
        const res = await fetch(`${API_URL}${path}`, {
            ...opts,
            headers,
            signal: controller.signal,
            body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
        });
        console.log('[api] ←', opts.method ?? 'GET', path, res.status);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new ApiError(err.message || 'Error en la solicitud', res.status, err);
        }
        if (res.status === 204)
            return undefined;
        return await res.json();
    }
    catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new ApiError('La solicitud tardó demasiado (timeout 60s)', 408);
        }
        console.error('[api] ✗', opts.method ?? 'GET', path, err);
        throw err;
    }
    finally {
        clearTimeout(timeout);
    }
}
export class ApiError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
    }
}
export const api = {
    get: (path) => apiRequest(path),
    post: (path, json) => apiRequest(path, { method: 'POST', json }),
    patch: (path, json) => apiRequest(path, { method: 'PATCH', json }),
    put: (path, json) => apiRequest(path, { method: 'PUT', json }),
    delete: (path) => apiRequest(path, { method: 'DELETE' }),
};
