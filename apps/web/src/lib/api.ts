import { supabase } from './supabase';

const API_URL = (import.meta.env.VITE_API_URL as string) || '/api';

// Cache del token: se actualiza desde AuthProvider cada vez que cambia la sesión.
// Evita llamar a supabase.auth.getSession() en cada request (esa llamada se cuelga
// intermitentemente cuando hay otra operación de auth en curso).
let cachedToken: string | null = null;

export function setAuthToken(token: string | null) {
  cachedToken = token;
}

export function getAuthToken(): string | null {
  return cachedToken;
}

type RequestOptions = RequestInit & { json?: unknown };

async function resolveToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  // Fallback: si aún no tenemos el token cacheado, intentamos una vez con un timeout corto
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 1500),
      ),
    ]);
    const token = result.data.session?.access_token ?? null;
    if (token) cachedToken = token;
    return token;
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = await resolveToken();
  const headers = new Headers(opts.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  // Silencia logs para endpoints de polling ruidosos (notificaciones, jobs activos).
  const silent =
    path.startsWith('/notifications') ||
    path.startsWith('/jobs/active') ||
    path.startsWith('/users/me');
  if (!silent) {
    console.log('[api] →', opts.method ?? 'GET', path, { hasToken: !!token });
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers,
      signal: controller.signal,
      body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    });

    if (!silent) {
      console.log('[api] ←', opts.method ?? 'GET', path, res.status);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message || 'Error en la solicitud', res.status, err);
    }

    if (res.status === 204) return undefined as T;
    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('La solicitud tardó demasiado (timeout 60s)', 408);
    }
    console.error('[api] ✗', opts.method ?? 'GET', path, err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: 'POST', json }),
  patch: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: 'PATCH', json }),
  put: <T>(path: string, json?: unknown) => apiRequest<T>(path, { method: 'PUT', json }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
