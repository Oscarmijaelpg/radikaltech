import { useEffect, useState } from 'react';
import { Spinner, Input, Label, Button } from '@radikal/ui';
import { Gift } from 'lucide-react';
import { useSystemConfig, useUpsertSystemConfig, type SystemConfigEntry } from '../api/config';
import { useToast } from '@/shared/ui/Toaster';

const DEFAULT_SIGNUP_BONUS = 1000;

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 0;
}

export function ConfigPage() {
  const { data, isLoading } = useSystemConfig();
  const upsert = useUpsertSystemConfig();
  const { toast } = useToast();

  const signupEntry = data?.find((e) => e.key === 'signup_bonus');
  const [bonus, setBonus] = useState<string>('');

  useEffect(() => {
    if (signupEntry) setBonus(String(readNumber(signupEntry.value)));
    else setBonus(String(DEFAULT_SIGNUP_BONUS));
  }, [signupEntry]);

  const parsedBonus = parseInt(bonus, 10);
  const currentBonus = signupEntry ? readNumber(signupEntry.value) : DEFAULT_SIGNUP_BONUS;
  const bonusDirty = Number.isFinite(parsedBonus) && parsedBonus >= 0 && parsedBonus !== currentBonus;

  const onSaveBonus = async () => {
    if (!bonusDirty) return;
    try {
      await upsert.mutateAsync({ key: 'signup_bonus', value: parsedBonus });
      toast({
        variant: 'success',
        title: 'Bono actualizado',
        description: `Los nuevos usuarios recibirán ${parsedBonus} monedas.`,
      });
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

  const otros: SystemConfigEntry[] = (data ?? []).filter((e) => e.key !== 'signup_bonus');

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black">Configuración</h1>
        <p className="text-sm text-slate-500">Parámetros globales de la plataforma.</p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 text-amber-700 p-2 shrink-0">
            <Gift size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h3 className="font-display text-lg font-black">Bono de registro</h3>
              <p className="text-xs text-slate-500">
                Monedas que recibe automáticamente un usuario nuevo al registrarse.
              </p>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <Label htmlFor="signup_bonus">Monedas</Label>
                <Input
                  id="signup_bonus"
                  type="number"
                  min={0}
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                />
              </div>
              <Button
                onClick={onSaveBonus}
                disabled={!bonusDirty || upsert.isPending}
                className="w-full sm:w-auto"
              >
                {upsert.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
            <div className="text-xs text-slate-400">
              Actual: <span className="font-medium text-slate-600">{currentBonus}</span> monedas
            </div>
          </div>
        </div>
      </div>

      {otros.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 space-y-3">
          <h3 className="font-display text-lg font-black">Otros parámetros</h3>
          <p className="text-xs text-slate-500">Configuraciones avanzadas (valores JSON).</p>
          <div className="divide-y divide-slate-100">
            {otros.map((e) => (
              <div key={e.key} className="py-3 text-sm flex flex-wrap items-center gap-2">
                <code className="font-mono">{e.key}</code>
                <span className="text-slate-400">=</span>
                <code className="text-xs text-slate-600">{JSON.stringify(e.value)}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
