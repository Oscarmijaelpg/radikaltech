import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

interface AuthProps {
  onLogin: () => void;
}

export const AuthPage: React.FC<AuthProps> = ({ onLogin }) => {
  const { login, loginWithGoogle, register, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        // Validation
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        if (!phoneNumber || phoneNumber.length < 7) throw new Error('Ingresa un número de celular válido');
        
        await register(email, password, fullName, phoneNumber);
      }

      // We'll navigate to root. The ProtectedRoute on root will handle onboarding redirection if needed.
      navigate('/');
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      // Note: Google Auth will redirect away from the app, so we don't need to navigate here.
      // The session will be restored on return if successful.
    } catch (err: any) {
      setError(err.message || 'Error de autenticación con Google');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico para recuperar la contraseña');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await resetPassword(email);
      setSuccessMessage('Te hemos enviado un correo para restablecer tu contraseña');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[hsl(var(--color-bg-light))] ">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center justify-center mb-10">
          <img
            src="https://i.ibb.co/NgHmpDKp/Sin-t-tulo-1.png"
            alt="Radikal Logo"
            className="h-16 w-auto mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700"
          />
          <div className="h-1 w-12 bg-gradient-to-r from-transparent via-[hsl(var(--color-primary))] to-transparent opacity-60 rounded-full shadow-[0_0_10px_hsl(var(--color-primary))]"></div>
          <span className="mt-4 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm">
            Desarrollo · v1.0.24
          </span>
        </div>

        {showInstallPrompt && (
          <div className="w-full mb-6 p-4 bg-white/80 backdrop-blur-md border border-[hsl(var(--color-primary)/0.3)] rounded-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-primary/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--color-primary)/0.1)] to-transparent opacity-50"></div>
            <div className="flex items-center gap-3 relative z-10 w-full">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-[hsl(var(--color-primary))] shrink-0">
                <span className="material-symbols-outlined text-[20px]">install_mobile</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-bold text-slate-800 line-clamp-1">Instalar Radikal App</h3>
                <p className="text-[11px] text-slate-500 line-clamp-1">Acceso rápido desde tu inicio</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                 <Button size="sm" onClick={handleInstallClick} className="whitespace-nowrap px-3 py-1.5 h-8 text-xs font-bold rounded-lg bg-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary)/0.9)] shadow-sm">
                   Instalar
                 </Button>
                 <button onClick={() => setShowInstallPrompt(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center w-6 h-6">
                   <span className="material-symbols-outlined text-[16px]">close</span>
                 </button>
              </div>
            </div>
          </div>
        )}

        <Card className="p-8 md:p-10 relative overflow-hidden backdrop-blur-xl bg-white/80 border-slate-200 shadow-2xl">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-4xl text-[hsl(var(--color-primary))]">progress_activity</span>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2 font-display">
              {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isLogin ? 'Ingresa a tu cuenta de Radikal AI' : 'Únete a la plataforma líder en IA'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-red-500">error</span>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
              <p className="text-sm text-emerald-600 font-medium">{successMessage}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <Input 
                type="text" 
                label="Nombre completo" 
                icon="person" 
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required 
              />
            )}
            
            <Input 
              type="email" 
              label="Correo electrónico" 
              icon="mail" 
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />

            {!isLogin && (
              <Input 
                type="tel" 
                label="Celular" 
                icon="smartphone" 
                placeholder="Ej. 999888777"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required 
              />
            )}

            <div className="space-y-1">
              <Input 
                type="password" 
                label="Contraseña" 
                icon="lock" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              {isLogin && (
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-[11px] text-slate-400 hover:text-[hsl(var(--color-primary))] transition-colors font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" isLoading={loading}>
              {isLogin ? 'Iniciar sesión' : 'Registrarse'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-[hsl(var(--color-primary))] transition-colors font-medium"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>

          <div className="mt-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 "></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400 font-medium">O continúa con</span>
              </div>
            </div>
            <div className="w-full">
              <Button type="button" variant="outline" className="w-full group" onClick={handleGoogleLogin}>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 transition-transform group-hover:scale-110" alt="Google" />
                <span className="text-sm">Google</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
