
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../../infrastructure/supabase/client';
import { User } from '../../core/domain/entities';
import { SupabaseAuthRepository } from '../../infrastructure/repositories/SupabaseAuthRepository';
import { LoginUseCase } from '../../core/application/use-cases/LoginUseCase';
import { LoginWithGoogleUseCase } from '../../core/application/use-cases/LoginWithGoogleUseCase';
import { RegisterUseCase } from '../../core/application/use-cases/RegisterUseCase';
import { UpdateOnboardingUseCase } from '../../core/application/use-cases/UpdateOnboardingUseCase';
import { ResetPasswordUseCase } from '../../core/application/use-cases/ResetPasswordUseCase';
import { UpdatePasswordUseCase } from '../../core/application/use-cases/UpdatePasswordUseCase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateOnboarding: (data: Partial<User>, channels?: string[]) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const authRepository = useMemo(() => new SupabaseAuthRepository(supabase), []);
  const loginUseCase = useMemo(() => new LoginUseCase(authRepository), [authRepository]);
  const loginWithGoogleUseCase = useMemo(() => new LoginWithGoogleUseCase(authRepository), [authRepository]);
  const registerUseCase = useMemo(() => new RegisterUseCase(authRepository), [authRepository]);
  const resetPasswordUseCase = useMemo(() => new ResetPasswordUseCase(authRepository), [authRepository]);
  const updatePasswordUseCase = useMemo(() => new UpdatePasswordUseCase(authRepository), [authRepository]);
  const updateOnboardingUseCase = useMemo(() => new UpdateOnboardingUseCase(authRepository), [authRepository]);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: stop loading after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => {
        if (mounted && loading) {
            console.warn('AuthProvider: INITIALIZATION TIMEOUT - Forcing loading=false');
            setLoading(false);
        }
    }, 5000);

    const initAuth = async () => {
      try {
        
        // Use getUser() directly instead of getSession() to avoid some known local caching issues
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            if (mounted) setUser(null);
        } else if (authUser) {
            const profile = await authRepository.getCurrentUser();
            if (mounted) setUser(profile);
        } else {
            if (mounted) setUser(null);
        }
      } catch (err) {
        console.error('AuthProvider: Fatal error in initAuth:', err);
      } finally {
        if (mounted) {
            setLoading(false);
            clearTimeout(safetyTimeout);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [authRepository]);

  const refreshProfile = async () => {
    try {
      const currentUser = await authRepository.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh profile', error);
    }
  };

  const login = async (email: string, password: string) => {
    const loggedUser = await loginUseCase.execute(email, password);
    setUser(loggedUser);
  };

  const register = async (email: string, password: string, fullName: string, phone: string) => {
    const registeredUser = await registerUseCase.execute(email, password, fullName, phone);
    setUser(registeredUser);
  };

  const resetPassword = async (email: string) => {
    await resetPasswordUseCase.execute(email);
  };

  const updatePassword = async (newPassword: string) => {
    await updatePasswordUseCase.execute(newPassword);
  };

  const updateOnboarding = async (data: Partial<User>, channels?: string[]) => {
    if (!user) return;
    const updateData = { ...data, email: user.email, full_name: user.full_name };
    await updateOnboardingUseCase.execute(user.id, updateData, channels);
    setUser(prevUser => prevUser ? { ...prevUser, ...updateData } : null);
  };

  const loginWithGoogle = async () => { await loginWithGoogleUseCase.execute(); };

  const logout = async () => {
    await authRepository.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, loginWithGoogle, register, resetPassword,
      updatePassword, updateOnboarding, logout, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
