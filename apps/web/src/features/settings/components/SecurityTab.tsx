import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Icon,
  Input,
  Label,
  Spinner,
} from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';
import { supabase } from '@/lib/supabase';

export function SecurityTab() {
  const { toast } = useToast();
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ email?: string; created_at?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionInfo({
          email: data.session.user.email ?? undefined,
          created_at: new Date(data.session.user.created_at ?? Date.now()).toLocaleString('es'),
        });
      }
    });
  }, []);

  const changePassword = async () => {
    if (newPass.length < 8) {
      toast({ title: 'Password muy corto', description: 'Mínimo 8 caracteres', variant: 'error' });
      return;
    }
    if (newPass !== confirm) {
      toast({ title: 'No coincide', description: 'Confirma la misma contraseña', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      toast({ title: 'Contraseña actualizada', variant: 'success' });
      setNewPass('');
      setConfirm('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo actualizar',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Cambiar contraseña</h3>
          <p className="text-sm text-slate-500">Mínimo 8 caracteres</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="new-pass">Nueva contraseña</Label>
            <Input id="new-pass" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pass">Confirmar</Label>
            <Input id="confirm-pass" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={changePassword} disabled={saving || !newPass || !confirm}>
            {saving ? <Spinner size="sm" /> : 'Actualizar contraseña'}
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Sesión activa</h3>
          <p className="text-sm text-slate-500">Dispositivo donde estás conectado ahora</p>
        </div>
        {sessionInfo ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50">
            <Icon name="devices" className="text-slate-500" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{sessionInfo.email}</p>
              <p className="text-xs text-slate-500">Cuenta desde {sessionInfo.created_at}</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white">
              Activa
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Sin sesión detectada</p>
        )}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: 'Acción no disponible',
                description:
                  'Requiere rotación global de JWT. Próximamente podrás cerrar todas las sesiones desde aquí.',
                variant: 'warning',
              })
            }
          >
            Cerrar sesión en todos los dispositivos
          </Button>
        </div>
      </Card>
    </div>
  );
}
