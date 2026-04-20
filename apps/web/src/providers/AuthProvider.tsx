import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { api, setAuthToken } from '@/lib/api';

function translateAuthError(err: AuthError | Error | unknown): Error {
  const raw = err instanceof Error ? err.message : 'Error de autenticación';
  const msg = raw.toLowerCase();

  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return new Error('Este correo ya está registrado. Inicia sesión.');
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return new Error('Correo o contraseña incorrectos.');
  }
  if (msg.includes('email not confirmed')) {
    return new Error('Tu correo aún no está confirmado. Revisa tu bandeja de entrada.');
  }
  if (msg.includes('user not found')) {
    return new Error('No encontramos una cuenta con ese correo.');
  }
  if (msg.includes('password should be at least')) {
    return new Error('La contraseña es demasiado corta (mínimo 6 caracteres).');
  }
  if (msg.includes('weak password') || msg.includes('password is too weak')) {
    return new Error('La contraseña es demasiado débil. Usa al menos 6 caracteres.');
  }
  if (msg.includes('email rate limit') || msg.includes('too many requests')) {
    return new Error('Demasiados intentos. Espera un momento antes de volver a intentarlo.');
  }
  if (msg.includes('for security purposes')) {
    return new Error('Por seguridad, espera unos segundos antes de reintentar.');
  }
  if (msg.includes('signup disabled') || msg.includes('signups not allowed')) {
    return new Error('El registro está deshabilitado temporalmente.');
  }
  if (msg.includes('invalid email') || msg.includes('email address is invalid')) {
    return new Error('El correo no tiene un formato válido.');
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return new Error('Error de conexión. Revisa tu red e intenta de nuevo.');
  }

  return new Error(raw);
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  onboarding_completed: boolean;
  onboarding_step: string;
  avatar_url: string | null;
  language: string;
}

interface AuthContextValue {
  session: Session | null;
  user: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function tryLoadProfile(retries = 3): Promise<Profile> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await api.get<{ data: Profile }>('/users/me');
      return res.data;
    } catch (err) {
      lastErr = err;
      // Back-off rápido: 300ms, 900ms, 1500ms (maneja la latencia del trigger de Supabase)
      await new Promise((r) => setTimeout(r, 300 + i * 600));
    }
  }
  throw lastErr;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadProfile = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setProfileError(null);
    try {
      const me = await tryLoadProfile();
      setProfile(me);
    } catch (err) {
      console.error('[auth] profile load failed', err);
      setProfile(null);
      setProfileError(err instanceof Error ? err.message : 'No pudimos cargar tu perfil');
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Hard timeout: si tras 8s no resolvió getSession, forzamos loading=false
    const hardTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[auth] hard timeout — forcing loading=false');
        setLoading(false);
      }
    }, 8000);

    (async () => {
      console.log('[auth] starting getSession');
      try {
        const { data } = await supabase.auth.getSession();
        console.log('[auth] getSession done, hasSession=', !!data.session);
        if (!mounted) return;
        setSession(data.session);
        setAuthToken(data.session?.access_token ?? null);
        if (data.session) await loadProfile();
      } catch (err) {
        console.error('[auth] getSession failed', err);
      } finally {
        clearTimeout(hardTimeout);
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setAuthToken(sess?.access_token ?? null);
      if (sess) await loadProfile();
      else {
        setProfile(null);
        setProfileError(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(hardTimeout);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw translateAuthError(error);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // Evita que una sesión previa contamine el registro nuevo.
    await supabase.auth.signOut();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw translateAuthError(error);

    // Supabase no lanza error si el email ya existe: devuelve user con identities vacío.
    // Detectamos ese caso para no crear la ilusión de registro exitoso.
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      throw new Error('Este correo ya está registrado. Inicia sesión.');
    }

    // Si confirmaciones están activas, signUp no devuelve sesión. Señalamos al UI.
    if (!data.session) {
      throw new Error(
        'Revisa tu correo para confirmar la cuenta antes de iniciar sesión.',
      );
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw translateAuthError(error);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        profileError,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
