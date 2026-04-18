import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@radikal/ui';
import { useBrandHistory, type BrandHistoryEntry } from '../../api/memory/brand';

interface Props {
  projectId: string;
}

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  brand_profile: {
    icon: 'edit_note',
    color: 'from-cyan-500 to-blue-500',
    label: 'Perfil de marca',
  },
  logo: { icon: 'image', color: 'from-pink-500 to-rose-500', label: 'Logo' },
  palette: {
    icon: 'palette',
    color: 'from-amber-500 to-orange-500',
    label: 'Paleta',
  },
  identity_change: {
    icon: 'auto_awesome',
    color: 'from-violet-500 to-purple-500',
    label: 'Identidad',
  },
};

const TRACKED_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'voiceTone', label: 'Tono / voz' },
  { key: 'essence', label: 'Esencia' },
  { key: 'mission', label: 'Misión' },
  { key: 'vision', label: 'Visión' },
  { key: 'visualDirection', label: 'Dirección visual' },
  { key: 'colorPalette', label: 'Paleta' },
  { key: 'brandValues', label: 'Valores' },
  { key: 'targetAudience', label: 'Audiencia' },
  { key: 'competitiveAdvantage', label: 'Ventaja competitiva' },
];

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function DiffDialog({
  entry,
  onClose,
}: {
  entry: BrandHistoryEntry | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[100vw] sm:max-w-3xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Cambios en la identidad</DialogTitle>
        </DialogHeader>
        {entry && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {TRACKED_FIELDS.map((f) => {
              const prev = entry.previous?.[f.key];
              const curr = entry.current?.[f.key];
              const changed = JSON.stringify(prev ?? null) !== JSON.stringify(curr ?? null);
              if (!changed) return null;
              return (
                <div
                  key={f.key}
                  className="rounded-xl border border-slate-200 p-3 bg-white"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    {f.label}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-rose-50 p-2 border border-rose-100">
                      <p className="text-[10px] font-bold text-rose-600 mb-1">Antes</p>
                      <p className="text-slate-700 whitespace-pre-wrap break-words">
                        {formatValue(prev)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 mb-1">Después</p>
                      <p className="text-slate-700 whitespace-pre-wrap break-words">
                        {formatValue(curr)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function BrandHistory({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [diffEntry, setDiffEntry] = useState<BrandHistoryEntry | null>(null);
  const { data = [], isLoading } = useBrandHistory(open ? projectId : null);

  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 grid place-items-center text-white shadow-md">
            <span className="material-symbols-outlined text-[20px]">history</span>
          </div>
          <div className="text-left">
            <h3 className="font-display font-black text-base sm:text-lg">Historial de identidad</h3>
            <p className="text-xs text-slate-500">
              Cambios relevantes a lo largo del tiempo
            </p>
          </div>
        </div>
        <span className="material-symbols-outlined text-slate-400">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="mt-5">
          {isLoading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Cargando…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Aún no hay cambios registrados.
            </p>
          ) : (
            <ol className="relative border-l-2 border-slate-200 ml-2 sm:ml-4 space-y-4 sm:space-y-5">
              {data.map((entry) => {
                const meta = TYPE_META[entry.snapshotType] ?? {
                  icon: 'circle',
                  color: 'from-slate-400 to-slate-600',
                  label: entry.snapshotType,
                };
                return (
                  <li key={entry.id} className="ml-4 sm:ml-6">
                    <span
                      className={`absolute -left-[13px] w-6 h-6 rounded-full bg-gradient-to-br ${meta.color} grid place-items-center text-white shadow`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {meta.icon}
                      </span>
                    </span>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {meta.label}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatDistanceToNow(new Date(entry.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-slate-700">
                        {entry.changeSummary ?? 'Se registraron cambios en la identidad.'}
                      </p>
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDiffEntry(entry)}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            compare_arrows
                          </span>
                          Ver diff
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      <DiffDialog entry={diffEntry} onClose={() => setDiffEntry(null)} />
    </Card>
  );
}
