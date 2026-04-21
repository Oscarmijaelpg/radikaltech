import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { AuthError, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { api, setAuthToken } from '@/lib/api';

function translateAuthError(err: AuthError | Error | unknown): Error {
  const raw = err instanceof Error ? err.message : 'Error de autenticación';
  const msg = raw.toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return new Error('Correo o contraseña incorrectos.');
  }
  if (msg.includes('email not confirmed')) {
    return new Error('Tu correo aún no está confirmado.');
  }
  if (msg.includes('too many requests')) {
    return new Error('Demasiados intentos. Espera un momento.');
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return new Error('Error de conexión. Revisa tu red.');
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

    const hardTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
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
