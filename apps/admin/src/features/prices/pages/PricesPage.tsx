import { useState, useEffect } from 'react';
import { Spinner, Switch, Input, Button } from '@radikal/ui';
import { Coins, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { useActionPrices, useUpdateActionPrice, type ActionPrice } from '../api/prices';
import { useToast } from '@/shared/ui/Toaster';

export function PricesPage() {
  const { data: prices, isLoading } = useActionPrices();
  const updatePrice = useUpdateActionPrice();
  const { toast } = useToast();

  const onToggle = async (key: string, enabled: boolean) => {
    try {
      await updatePrice.mutateAsync({ key, patch: { enabled } });
      toast({ variant: 'success', title: `Acción ${enabled ? 'habilitada' : 'deshabilitada'}` });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al actualizar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onSavePrice = async (key: string, monedas: number) => {
    try {
      await updatePrice.mutateAsync({ key, patch: { monedas } });
      toast({ variant: 'success', title: 'Precio actualizado' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al guardar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8 grid place-items-center h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const items = prices ?? [];

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black">Precios de acciones</h1>
        <p className="text-sm text-slate-500">
          Configura cuántas monedas cuesta cada acción. El cambio aplica al instante.
        </p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4">
        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Sin acciones configuradas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <PriceRow
                key={item.key}
                item={item}
                onToggle={(enabled) => onToggle(item.key, enabled)}
                onSave={(monedas) => onSavePrice(item.key, monedas)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PriceRowProps {
  item: ActionPrice;
  onToggle: (enabled: boolean) => void;
  onSave: (monedas: number) => Promise<void>;
}

function PriceRow({ item, onToggle, onSave }: PriceRowProps) {
  const [value, setValue] = useState(String(item.monedas));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(String(item.monedas));
  }, [item.monedas]);

  const parsed = parseInt(value, 10);
  const dirty = Number.isFinite(parsed) && parsed !== item.monedas && parsed >= 0;

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await onSave(parsed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-3 px-2 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Switch checked={item.enabled} onCheckedChange={onToggle} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.label}</div>
          <code className="text-[11px] text-slate-400 font-mono break-all">{item.key}</code>
          {item.description && (
            <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 pl-[52px] sm:pl-0">
        <div className="relative flex-1 sm:flex-none">
          <Coins
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none"
          />
          <Input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="w-full sm:w-[120px] pl-8 text-right"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving}
          className={clsx('shrink-0', !dirty && 'opacity-0 pointer-events-none')}
        >
          <Save size={14} />
          <span className="hidden sm:inline">Guardar</span>
        </Button>
      </div>
    </div>
  );
}
