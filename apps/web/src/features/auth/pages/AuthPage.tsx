import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@radikal/ui';
import { useAuth } from '@/providers/AuthProvider';
import radikalLogo from '@/media/radikal-logo.png';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        await signUp(email, password, fullName);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error con Google');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-6 sm:p-4 bg-gradient-to-br from-pink-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="hidden sm:block absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--color-primary)/0.15)] blur-3xl pointer-events-none" />
      <div className="hidden sm:block absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(var(--color-secondary)/0.15)] blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="flex flex-col items-center justify-center mb-8">
          <img
            src={radikalLogo}
            alt="Radikal"
            className="h-16 w-auto mb-3 animate-in fade-in slide-in-from-bottom-2 duration-700"
          />
          <p className="text-slate-500 text-sm mt-1 font-medium">Inteligencia radical</p>
          <div className="h-1 w-12 bg-gradient-to-r from-transparent via-[hsl(var(--color-primary))] to-transparent opacity-60 rounded-full shadow-[0_0_10px_hsl(var(--color-primary))] mt-4" />
          <span className="mt-4 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm">
            Desarrollo · v1.0
          </span>
        </div>

        <Card className="p-5 sm:p-8 md:p-10 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-[32px]">
              <span className="material-symbols-outlined animate-spin text-4xl text-[hsl(var(--color-primary))]">
                progress_activity
              </span>
            </div>
          )}

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 font-display">
              {isLogin ? 'Bienvenido' : 'Crear cuenta'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isLogin ? 'Ingresa a tu cuenta de Radikal' : 'Únete a la plataforma de IA de marca'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-red-500">error</span>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
              <p className="text-sm text-emerald-600 font-medium">{success}</p>
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
                    onClick={() => setSuccess('Funcionalidad de recuperación próximamente')}
                    className="text-[11px] text-slate-400 hover:text-[hsl(var(--color-primary))] transition-colors font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
              {isLogin ? 'Iniciar sesión' : 'Registrarse'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
              }}
              className="text-sm text-slate-500 hover:text-[hsl(var(--color-primary))] transition-colors font-medium"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>

          <div className="mt-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400 font-medium">O continúa con</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full group min-h-[44px]"
              onClick={handleGoogle}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5 h-5 transition-transform group-hover:scale-110"
                alt="Google"
              />
              <span className="text-sm">Google</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
