import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
} from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';

export function DataTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await api.get<{ data: unknown }>('/users/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `radikal-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Descarga iniciada', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo exportar',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      await signOut();
      navigate('/auth');
      toast({ title: 'Cuenta eliminada', description: 'Tu cuenta y datos fueron borrados.' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo eliminar',
        variant: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Exportar mis datos</h3>
          <p className="text-sm text-slate-500">
            Descarga todos tus proyectos, memorias, reportes y chats en formato JSON.
          </p>
        </div>
        <Button onClick={exportData} disabled={exporting}>
          {exporting ? <Spinner size="sm" /> : 'Descargar JSON'}
        </Button>
      </Card>

      <Card className="p-4 sm:p-6 md:p-8 space-y-4 border-red-200">
        <div>
          <h3 className="font-bold text-red-600">Eliminar mi cuenta</h3>
          <p className="text-sm text-slate-500">
            Esta acción es permanente. Perderás todos tus proyectos, contenidos y análisis.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Eliminar cuenta
        </Button>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Para confirmar, escribe <strong>ELIMINAR</strong> abajo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Escribe ELIMINAR"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'ELIMINAR' || deleting}
              onClick={deleteAccount}
            >
              {deleting ? <Spinner size="sm" /> : 'Sí, eliminar todo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
