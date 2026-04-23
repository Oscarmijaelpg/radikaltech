import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@radikal/ui';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  confirmLabel?: string;
  loading?: boolean;
  /** Si se setea a true, pide también la contraseña del admin caller. */
  requirePassword?: boolean;
  onConfirm: (password?: string) => void;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel = 'Eliminar',
  loading,
  requirePassword = false,
  onConfirm,
}: Props) {
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const canConfirm =
    value === confirmText && (!requirePassword || password.length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setValue('');
          setPassword('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-red-100 text-red-600 p-2">
              <AlertTriangle size={20} />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Para confirmar, escribe: <span className="font-mono text-red-600">{confirmText}</span>
            </Label>
            <Input
              id="confirm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
            />
          </div>

          {requirePassword && (
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                Tu contraseña de admin (re-confirmación)
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(requirePassword ? password : undefined)}
            disabled={!canConfirm || loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Eliminando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
