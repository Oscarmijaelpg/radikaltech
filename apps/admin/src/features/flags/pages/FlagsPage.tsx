import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Switch,
  Spinner,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  Textarea,
} from '@radikal/ui';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useFlags, useCreateFlag, useUpdateFlag, useDeleteFlag } from '../api/flags';
import { useToast } from '@/shared/ui/Toaster';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export function FlagsPage() {
  const { data: flags, isLoading } = useFlags();
  const createFlag = useCreateFlag();
  const updateFlag = useUpdateFlag();
  const deleteFlag = useDeleteFlag();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ key: '', description: '', enabled: false });
  const { toast } = useToast();
  const confirm = useConfirm();

  const onCreate = async () => {
    try {
      await createFlag.mutateAsync({
        key: form.key.trim(),
        description: form.description.trim() || undefined,
        enabled: form.enabled,
      });
      setCreating(false);
      setForm({ key: '', description: '', enabled: false });
      toast({ variant: 'success', title: 'Funcionalidad creada' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al crear',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onToggle = async (key: string, enabled: boolean) => {
    try {
      await updateFlag.mutateAsync({ key, patch: { enabled } });
      toast({ variant: 'success', title: `Funcionalidad ${enabled ? 'activada' : 'pausada'}` });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al actualizar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onDelete = async (key: string) => {
    const ok = await confirm({
      title: `Eliminar funcionalidad "${key}"`,
      description: 'Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await deleteFlag.mutateAsync(key);
      toast({ variant: 'success', title: 'Funcionalidad eliminada' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al eliminar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">Funcionalidades</h1>
          <p className="text-sm text-slate-500">Toggles globales con excepciones por usuario.</p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus size={16} className="mr-2" />
          <span className="hidden sm:inline">Nueva funcionalidad</span>
          <span className="sm:hidden">Nueva</span>
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4">
        {isLoading ? (
          <div className="py-12 grid place-items-center"><Spinner /></div>
        ) : !flags || flags.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            Sin funcionalidades. Crea la primera con el botón de arriba.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {flags.map((f) => (
              <div key={f.id} className="flex items-center gap-4 py-4 px-2">
                <Switch
                  checked={f.enabled}
                  onCheckedChange={(enabled) => onToggle(f.key, enabled)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-medium">{f.key}</code>
                    {Object.keys(f.userOverrides ?? {}).length > 0 && (
                      <span className="text-xs text-slate-500">
                        · {Object.keys(f.userOverrides).length} excepciones
                      </span>
                    )}
                  </div>
                  {f.description && <div className="text-sm text-slate-500">{f.description}</div>}
                  <div className="text-xs text-slate-400 mt-1">
                    Actualizado {format(new Date(f.updatedAt), 'dd MMM yyyy HH:mm')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(f.key)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                  aria-label="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogTitle>Nueva funcionalidad</DialogTitle>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="key">Identificador (solo a-z, 0-9, _, -)</Label>
              <Input
                id="key"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="ej. nuevo_chat"
              />
            </div>
            <div>
              <Label htmlFor="desc">Descripción (opcional)</Label>
              <Textarea
                id="desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <Label htmlFor="enabled">Activada por defecto</Label>
              <Switch
                id="enabled"
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button
              onClick={onCreate}
              disabled={!form.key.match(/^[a-z0-9_-]+$/i) || createFlag.isPending}
            >
              {createFlag.isPending ? 'Creando…' : 'Crear'}
            </Button>
          </DialogFooter>
          {createFlag.isError && (
            <div className="text-sm text-red-600 mt-3">
              {createFlag.error instanceof Error ? createFlag.error.message : 'Error al crear'}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
