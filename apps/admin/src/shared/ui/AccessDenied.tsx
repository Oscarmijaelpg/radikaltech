import { Button } from '@radikal/ui';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export function AccessDenied() {
  const { signOut, profile } = useAuth();
  return (
    <div className="min-h-screen grid place-items-center bg-[hsl(var(--color-bg))] p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 text-red-500 grid place-items-center">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold mb-1">Acceso denegado</h2>
          <p className="text-sm text-slate-500">
            La cuenta <span className="font-medium">{profile?.email}</span> no tiene permisos de administrador.
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>Cerrar sesión</Button>
      </div>
    </div>
  );
}
