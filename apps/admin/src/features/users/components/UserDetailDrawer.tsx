import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
  Spinner,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@radikal/ui';
import { LogOut, Download, Trash2, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import {
  useAdminUser,
  useUpdateUser,
  useForceLogout,
  useExportUser,
  useDeleteUser,
  useImpersonate,
} from '../api/users';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { useToast } from '@/shared/ui/Toaster';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

interface Props {
  userId: string | null;
  onClose: () => void;
}

export function UserDetailDrawer({ userId, onClose }: Props) {
  const { data: user, isLoading } = useAdminUser(userId);
  const updateUser = useUpdateUser();
  const forceLogout = useForceLogout();
  const exportUser = useExportUser();
  const deleteUser = useDeleteUser();
  const impersonate = useImpersonate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();
  const confirmDialog = useConfirm();

  const open = !!userId;

  const onRoleChange = async (newRole: 'user' | 'admin') => {
    if (!userId || !user) return;
    if (newRole === user.role) return;
    try {
      await updateUser.mutateAsync({ id: userId, patch: { role: newRole } });
      toast({ variant: 'success', title: `Rol cambiado a ${newRole}` });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'No se pudo cambiar el rol',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onForceLogout = async () => {
    if (!userId) return;
    const ok = await confirmDialog({
      title: 'Forzar cierre de sesión',
      description: 'Se cerrarán todas las sesiones activas de este usuario.',
      confirmLabel: 'Forzar logout',
    });
    if (!ok) return;
    try {
      await forceLogout.mutateAsync(userId);
      toast({ variant: 'success', title: 'Sesiones cerradas' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al forzar logout',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onImpersonate = async () => {
    if (!userId || !user) return;
    const ok = await confirmDialog({
      title: `Impersonar a ${user.email}`,
      description: 'Se generará un magic link. Ábrelo en ventana privada para no perder tu sesión admin actual.',
      confirmLabel: 'Generar link',
    });
    if (!ok) return;
    try {
      const res = await impersonate.mutateAsync(userId);
      try {
        await navigator.clipboard.writeText(res.actionLink);
      } catch {
        // ignore
      }
      window.open(res.actionLink, '_blank', 'noopener,noreferrer');
      toast({
        variant: 'success',
        title: 'Magic link copiado al portapapeles',
        description: 'Se abrió en una pestaña nueva. Expira en 1 hora.',
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'No se pudo impersonar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onExport = async () => {
    if (!userId) return;
    try {
      const data = await exportUser.mutateAsync(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-${userId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ variant: 'success', title: 'Export descargado' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al exportar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onConfirmDelete = async () => {
    if (!userId) return;
    try {
      await deleteUser.mutateAsync(userId);
      setConfirmDelete(false);
      onClose();
      toast({ variant: 'success', title: 'Usuario eliminado' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al eliminar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          {isLoading || !user ? (
            <div className="py-12 grid place-items-center"><Spinner /></div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <DialogTitle>{user.full_name ?? user.email}</DialogTitle>
                  <Badge variant={user.role === 'admin' ? 'primary' : 'outline'}>
                    {user.role}
                  </Badge>
                  {user.onboarding_completed ? (
                    <Badge variant="outline">Onboarding completo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600">Pendiente onboarding</Badge>
                  )}
                </div>
                <DialogDescription>{user.email}</DialogDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Info label="ID" value={<code className="text-xs break-all">{user.id}</code>} />
                <Info label="Idioma" value={user.language} />
                <Info label="Alta" value={format(new Date(user.created_at), 'dd MMM yyyy HH:mm')} />
                <Info label="Actualizado" value={format(new Date(user.updated_at), 'dd MMM yyyy HH:mm')} />
                <Info label="Teléfono" value={user.phone ?? '—'} />
                <Info label="Paso onboarding" value={user.onboarding_step} />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <MetricBox label="Proyectos" value={user.counts.projects} />
                <MetricBox label="Chats" value={user.counts.chats} />
                <MetricBox label="Tareas" value={user.counts.jobs} />
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="text-sm font-medium">Cambiar rol</div>
                <Select value={user.role} onValueChange={(v) => onRoleChange(v as 'user' | 'admin')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={onImpersonate} disabled={impersonate.isPending}>
                  <UserCog size={16} className="mr-2" />
                  Impersonar
                </Button>
                <Button variant="outline" onClick={onForceLogout} disabled={forceLogout.isPending}>
                  <LogOut size={16} className="mr-2" />
                  Forzar logout
                </Button>
                <Button variant="outline" onClick={onExport} disabled={exportUser.isPending}>
                  <Download size={16} className="mr-2" />
                  Exportar datos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} className="mr-2" />
                  Eliminar cuenta
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar usuario"
        description={`Esta acción elimina la cuenta ${user?.email ?? ''} y TODOS sus datos (proyectos, chats, mensajes, reportes). No se puede deshacer.`}
        confirmText={user?.email ?? ''}
        confirmLabel="Eliminar cuenta"
        loading={deleteUser.isPending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-display text-xl font-bold">{value}</div>
    </div>
  );
}
