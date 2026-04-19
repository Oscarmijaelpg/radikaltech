import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Icon,
  Input,
  Spinner,
} from '@radikal/ui';
import { BusyOverlay } from '@/shared/ui/BusyOverlay';
import { useCompetitors } from '@/features/memory/api/memory';
import {
  useAggregateNewsReport,
  useGenerateBrandStrategy,
  useGenerateCompetition,
  useGenerateMonthlyAudit,
  useGenerateUnified,
  type Report,
} from '../api/reports';
import { REPORT_MODES_LIST, REPORT_MODES, type ReportMode } from './generator/report-modes';
import { ReportPreview } from './generator/ReportPreview';

interface Props {
  projectId: string;
  onCreated?: (report: Report | { id: string }) => void;
}

const GENERATION_STAGES = [
  'Reuniendo los datos del proyecto',
  'Consultando la memoria de marca',
  'Analizando señales externas',
  'Redactando el informe',
];

export function ReportGeneratorButton({ projectId, onCreated }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<ReportMode | null>(null);
  const [competitorId, setCompetitorId] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);

  const competitors = useCompetitors(projectId);
  const brandStrategy = useGenerateBrandStrategy();
  const audit = useGenerateMonthlyAudit();
  const competition = useGenerateCompetition();
  const news = useAggregateNewsReport();
  const unified = useGenerateUnified();

  const busy =
    brandStrategy.isPending ||
    audit.isPending ||
    competition.isPending ||
    news.isPending ||
    unified.isPending;

  const openMode = (m: ReportMode) => {
    setMenuOpen(false);
    setMode(m);
    setError(null);
  };

  const close = () => {
    if (busy) return;
    setMode(null);
    setCompetitorId('');
    setTopic('');
    setError(null);
  };

  const run = async () => {
    if (!mode) return;
    setError(null);
    try {
      if (mode === 'unified') {
        const r = await unified.mutateAsync({ project_id: projectId });
        onCreated?.(r);
      } else if (mode === 'competition') {
        if (!competitorId) return;
        const r = await competition.mutateAsync({
          project_id: projectId,
          competitor_id: competitorId,
        });
        onCreated?.(r);
      } else if (mode === 'news') {
        if (!topic.trim()) return;
        const r = await news.mutateAsync({ project_id: projectId, topic: topic.trim() });
        if (r.report) onCreated?.({ id: r.report.id });
      } else if (mode === 'brand') {
        const r = await brandStrategy.mutateAsync({ project_id: projectId });
        onCreated?.(r);
      } else if (mode === 'audit') {
        const r = await audit.mutateAsync({ project_id: projectId });
        onCreated?.(r);
      }
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const currentMeta = mode ? REPORT_MODES[mode] : null;
  const canRun = (() => {
    if (!currentMeta) return false;
    if (currentMeta.requiresInput === 'competitor') return !!competitorId;
    if (currentMeta.requiresInput === 'topic') return !!topic.trim();
    return true;
  })();

  return (
    <div className="relative">
      <Button onClick={() => setMenuOpen((v) => !v)} data-tour="reports-new">
        <Icon name="add" className="text-[18px]" />
        Nuevo reporte
        <Icon name="expand_more" className="text-[18px]" />
      </Button>

      {menuOpen && (
        <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-auto sm:w-[320px] rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden z-30">
          {REPORT_MODES_LIST.map((m) => (
            <MenuItem
              key={m.id}
              icon={m.icon}
              title={m.title}
              subtitle={m.subtitle}
              onClick={() => openMode(m.id)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={mode !== null}
        onOpenChange={(o) => {
          if (busy) return;
          if (!o) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentMeta?.title ?? ''}</DialogTitle>
          </DialogHeader>

          {currentMeta && (
            <div className="space-y-5">
              <ReportPreview meta={currentMeta} />

              {currentMeta.requiresInput === 'competitor' && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Elige al competidor
                  </label>
                  <select
                    value={competitorId}
                    onChange={(e) => setCompetitorId(e.target.value)}
                    className="flex h-12 w-full items-center justify-between rounded-2xl bg-slate-100 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:bg-white"
                  >
                    <option value="">— Selecciona —</option>
                    {(competitors.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentMeta.requiresInput === 'topic' && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Tema a rastrear
                  </label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ej. Tendencias en IA generativa 2026"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="ghost" onClick={close} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void run()} disabled={!canRun || busy}>
                  {busy && <Spinner className="h-4 w-4 mr-1" />}
                  Generar reporte
                </Button>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {busy && currentMeta && (
        <BusyOverlay
          character="kronos"
          title={`Generando: ${currentMeta.title}`}
          subtitle={currentMeta.description}
          estimatedSeconds={currentMeta.estimatedSeconds}
          stages={GENERATION_STAGES}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 min-h-[56px] hover:bg-violet-50 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-violet-100 grid place-items-center shrink-0">
        <Icon name={icon} className="text-violet-600 text-[20px]" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 leading-snug">{subtitle}</p>
      </div>
    </button>
  );
}
