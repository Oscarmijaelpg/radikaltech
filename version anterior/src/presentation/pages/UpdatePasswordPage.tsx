import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export const UpdatePasswordPage: React.FC = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate('/auth'), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[hsl(var(--color-bg-light))]">
        <Card className="p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Contraseña actualizada</h1>
          <p className="text-slate-500 mb-8">
            Tu contraseña ha sido actualizada con éxito. Serás redirigido al inicio de sesión en unos segundos.
          </p>
          <Button onClick={() => navigate('/auth')} className="w-full">
            Ir al inicio de sesión ahora
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[hsl(var(--color-bg-light))]">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center justify-center mb-10">
          <img
            src="https://i.ibb.co/NgHmpDKp/Sin-t-tulo-1.png"
            alt="Radikal Logo"
            className="h-16 w-auto mb-4"
          />
        </div>

        <Card className="p-8 md:p-10 backdrop-blur-xl bg-white/80 border-slate-200 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2 font-display">
              Nueva Contraseña
            </h1>
            <p className="text-slate-500 text-sm">
              Ingresa tu nueva contraseña para acceder a Radikal AI
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">error</span>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input 
              type="password" 
              label="Nueva Contraseña" 
              icon="lock" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <Input 
              type="password" 
              label="Confirmar Contraseña" 
              icon="lock_reset" 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />

            <Button type="submit" className="w-full mt-2" size="lg" isLoading={loading}>
              Actualizar Contraseña
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
