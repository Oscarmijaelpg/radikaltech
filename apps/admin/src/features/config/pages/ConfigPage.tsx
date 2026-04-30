import { useEffect, useRef, useState } from 'react';
import { Spinner, Input, Label, Button } from '@radikal/ui';
import { Gift, Pencil, X, Check } from 'lucide-react';
import { useSystemConfig, useUpsertSystemConfig, type SystemConfigEntry } from '../api/config';
import { useToast } from '@/shared/ui/Toaster';

const DEFAULT_SIGNUP_BONUS = 1000;

function ConfigEntryRow({ entry }: { entry: SystemConfigEntry }) {
  const upsert = useUpsertSystemConfig();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const [parseError, setParseError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onEdit = () => {
    setRaw(JSON.stringify(entry.value, null, 2));
    setParseError('');
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const onCancel = () => {
    setEditing(false);
    setParseError('');
  };

  const onSave = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      setParseError('JSON inválido: ' + (e instanceof Error ? e.message : String(e)));
      return;
    }
    try {
      await upsert.mutateAsync({ key: entry.key, value: parsed });
      toast({ variant: 'success', title: `${entry.key} actualizado` });
      setEditing(false);
    } catch (err) {
      toast({ variant: 'error', title: 'Error al guardar', description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="py-3 text-sm space-y-2">
      <div className="flex items-center gap-2">
        <code className="font-mono text-slate-700">{entry.key}</code>
        {!editing && (
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto text-slate-400 hover:text-slate-700 p-1 rounded"
            aria-label={`Editar ${entry.key}`}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setParseError(''); }}
            rows={Math.min(12, raw.split('\n').length + 1)}
            className="w-full font-mono text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y bg-slate-50"
            spellCheck={false}
          />
          {parseError && <p className="text-xs text-red-600">{parseError}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} disabled={upsert.isPending}>
              <Check size={14} />
              {upsert.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X size={14} />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <code className="block text-xs text-slate-500 bg-slate-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(entry.value, null, 2)}
        </code>
      )}
    </div>
  );
}

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
              <ConfigEntryRow key={e.key} entry={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
