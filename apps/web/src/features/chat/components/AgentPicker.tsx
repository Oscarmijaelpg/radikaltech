import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Spinner,
} from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { AGENTS } from '../agents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (agentIds: string[]) => void;
  loading?: boolean;
}

const MAX_AGENTS = 3;

export function AgentPicker({ open, onOpenChange, onPick, loading }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_AGENTS) return prev;
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    onPick(selected);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSelected([]);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:!max-w-3xl max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Elige 1 o hasta {MAX_AGENTS} agentes
            <span className="block sm:inline sm:ml-2 text-xs font-medium text-slate-500 mt-1 sm:mt-0">
              (multi-agente permite que el router elija el mejor por mensaje)
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 mt-2">
          {AGENTS.map((a) => {
            const isSelected = selected.includes(a.id);
            const disabled = !isSelected && selected.length >= MAX_AGENTS;
            return (
              <button
                key={a.id}
                type="button"
                disabled={loading || disabled}
                onClick={() => toggle(a.id)}
                className={cn(
                  'flex flex-col items-center text-center rounded-2xl border transition-all hover:-translate-y-1 disabled:opacity-50 disabled:pointer-events-none relative group overflow-hidden',
                  isSelected
                    ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.04)] shadow-lg ring-2 ring-[hsl(var(--color-primary)/0.4)]'
                    : 'border-slate-200 bg-white hover:shadow-lg hover:border-slate-300',
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[hsl(var(--color-primary))] text-white grid place-items-center z-10 shadow-md">
                    <Icon name="check" className="text-[16px]" />
                  </span>
                )}
                {/* Agent image - takes full card width */}
                <div
                  className={cn(
                    'w-full aspect-square bg-gradient-to-br overflow-hidden transition-transform group-hover:scale-[1.03]',
                    a.color,
                  )}
                >
                  <img src={a.image} alt={a.name} className="w-full h-full object-cover" />
                </div>
                {/* Text below image */}
                <div className="p-3 sm:p-4 w-full">
                  <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">{a.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    {a.role}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{a.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <p className="text-xs text-slate-500 sm:mr-auto self-center">
            {selected.length === 0
              ? 'Selecciona al menos 1 agente'
              : selected.length === 1
                ? 'Modo individual'
                : `Modo multi-agente (${selected.length})`}
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={loading || selected.length === 0} className="flex-1 sm:flex-none">
              {loading ? <Spinner size="sm" /> : 'Crear'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
