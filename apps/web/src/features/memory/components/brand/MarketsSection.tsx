import { useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useDetectMarkets, useUpdateMarkets } from '../../api/memory';
import { SectionTitle } from './shared';
import { LATAM_COUNTRIES, countryName, flagFromIso } from './utils';

export function MarketsSection({ projectId }: { projectId: string }) {
  const { activeProject } = useProject();
  const detect = useDetectMarkets(projectId);
  const updateMarkets = useUpdateMarkets(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  if (!activeProject) return null;
  const confirmed = activeProject.operating_countries ?? [];
  const suggestedAll = activeProject.operating_countries_suggested ?? [];
  const suggestedDistinct = suggestedAll.filter((c) => !confirmed.includes(c));

  const openDialog = () => {
    setDraft(confirmed.length > 0 ? confirmed : suggestedAll);
    setDialogOpen(true);
  };

  const toggle = (code: string) => {
    setDraft((d) => (d.includes(code) ? d.filter((x) => x !== code) : [...d, code]));
  };

  const save = async () => {
    await updateMarkets.mutateAsync(draft);
    setDialogOpen(false);
  };

  const confirmSuggested = async () => {
    const merged = Array.from(new Set([...confirmed, ...suggestedAll]));
    await updateMarkets.mutateAsync(merged);
  };

  return (
    <Card className="p-4 sm:p-6 md:p-8 bg-white border-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
        <SectionTitle icon="public">Mercados donde operas</SectionTitle>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => detect.mutate()}
            disabled={detect.isPending}
          >
            {detect.isPending ? <Spinner /> : 'Detectar con IA'}
          </Button>
          <Button size="sm" variant="outline" onClick={openDialog}>
            Editar mercados
          </Button>
        </div>
      </div>

      {confirmed.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {confirmed.map((code) => (
            <span
              key={code}
              className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm font-semibold flex items-center gap-1.5"
            >
              <span className="text-base">{flagFromIso(code)}</span>
              {countryName(code)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-slate-400">Aún no has confirmado mercados</p>
      )}

      {suggestedDistinct.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-700 text-[20px]">
              auto_awesome
            </span>
            <p className="text-sm text-amber-900 font-semibold">
              IA detectó estos mercados. ¿Confirmas?
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedDistinct.map((code) => (
              <span
                key={code}
                className="px-3 py-1.5 rounded-full bg-white border border-amber-300 text-amber-900 text-sm font-semibold flex items-center gap-1.5"
              >
                <span className="text-base">{flagFromIso(code)}</span>
                {countryName(code)}
              </span>
            ))}
          </div>
          <Button size="sm" onClick={confirmSuggested} disabled={updateMarkets.isPending}>
            Confirmar mercados
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-lg h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Mercados donde operas</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[60vh] overflow-auto py-2">
            {LATAM_COUNTRIES.map((c) => {
              const checked = draft.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggle(c.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left ${
                    checked
                      ? 'bg-[hsl(var(--color-primary))] text-white border-[hsl(var(--color-primary))]'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{flagFromIso(c.code)}</span>
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={updateMarkets.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
