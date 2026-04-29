import { useState } from 'react';
import { Button, Input, Label, Spinner, Badge } from '@radikal/ui';
import { Coins, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { useUserCredits, useAdjustUserCredits, type CreditTransaction } from '../api/credits';
import { useToast } from '@/shared/ui/Toaster';

interface Props {
  userId: string;
}

const KIND_LABEL: Record<CreditTransaction['kind'], string> = {
  grant: 'Bono',
  spend: 'Consumo',
  refund: 'Reembolso',
  adjustment: 'Ajuste',
};

const KIND_VARIANT: Record<
  CreditTransaction['kind'],
  'success' | 'warning' | 'primary' | 'muted'
> = {
  grant: 'success',
  spend: 'muted',
  refund: 'primary',
  adjustment: 'warning',
};

export function UserCreditsPanel({ userId }: Props) {
  const { data, isLoading } = useUserCredits(userId);
  const adjust = useAdjustUserCredits();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const apply = async (sign: 1 | -1) => {
    const parsed = parseInt(amount, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({ variant: 'error', title: 'Ingresa un monto válido' });
      return;
    }
    if (!reason.trim()) {
      toast({ variant: 'error', title: 'Indica un motivo' });
      return;
    }
    try {
      const res = await adjust.mutateAsync({
        userId,
        amount: parsed * sign,
        reason: reason.trim(),
      });
      setAmount('');
      setReason('');
      toast({
        variant: 'success',
        title: sign > 0 ? 'Monedas añadidas' : 'Monedas removidas',
        description: `Nuevo saldo: ${res.balance}`,
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4 grid place-items-center h-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-amber-100 text-amber-700 p-2">
            <Coins size={18} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Saldo actual</div>
            <div className="font-display text-2xl font-black">
              {data.balance.toLocaleString('es-MX')}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2">
          <div>
            <Label htmlFor="credit-amount">Monto</Label>
            <Input
              id="credit-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <div>
            <Label htmlFor="credit-reason">Motivo</Label>
            <Input
              id="credit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. compensación"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => apply(1)}
            disabled={adjust.isPending}
            className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Plus size={14} />
            Añadir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => apply(-1)}
            disabled={adjust.isPending}
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
          >
            <Minus size={14} />
            Quitar
          </Button>
        </div>
      </div>

      {data.history.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 pb-1">
            Últimos movimientos
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-200/60">
            {data.history.map((t) => (
              <div key={t.id} className="py-2 flex items-start gap-2 text-sm">
                <Badge variant={KIND_VARIANT[t.kind]} className="shrink-0 mt-0.5">
                  {KIND_LABEL[t.kind]}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <div className="text-xs text-slate-600 break-words flex-1 min-w-0">
                      {t.reason ?? t.actionKey ?? '—'}
                    </div>
                    <div
                      className={clsx(
                        'font-mono text-sm shrink-0',
                        t.amount > 0 ? 'text-emerald-600' : 'text-slate-700',
                      )}
                    >
                      {t.amount > 0 ? '+' : ''}
                      {t.amount.toLocaleString('es-MX')}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {format(new Date(t.createdAt), 'dd MMM HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
