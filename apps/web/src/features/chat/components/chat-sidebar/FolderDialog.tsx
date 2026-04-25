import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@radikal/ui';
import type { ChatFolder } from '../../api/chat';

interface Props {
  open: boolean;
  editing: ChatFolder | null;
  name: string;
  color: string;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeName: (value: string) => void;
  onChangeColor: (value: string) => void;
  onSave: () => Promise<void> | void;
}

export function FolderDialog({
  open,
  editing,
  name,
  color,
  saving,
  onOpenChange,
  onChangeName,
  onChangeColor,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar carpeta' : 'Nueva carpeta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="Ej: Campaña 2026"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => onChangeColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <span className="text-xs text-slate-500">{color}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={!name.trim() || saving}>
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
