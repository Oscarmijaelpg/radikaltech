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
import { useCompetitors } from '@/features/memory/api/memory';
import {
  useAggregateNewsReport,
  useGenerateBrandStrategy,
  useGenerateCompetition,
  useGenerateMonthlyAudit,
  useGenerateUnified,
  type Report,
} from '../api/reports';

interface Props {
  projectId: string;
  onCreated?: (report: Report | { id: string }) => void;
}

type Mode = null | 'competition' | 'news' | 'brand' | 'audit' | 'unified';

export function ReportGeneratorButton({ projectId, onCreated }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
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
    brandStrategy.isPending || audit.isPending || competition.isPending || news.isPending || unified.isPending;

  const openMode = (m: Exclude<Mode, null>) => {
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

  const runBrand = async () => {
    setError(null);
    try {
      const r = await brandStrategy.mutateAsync({ project_id: projectId });
      onCreated?.(r);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const runAudit = async () => {
    setError(null);
    try {
      const r = await audit.mutateAsync({ project_id: projectId });
      onCreated?.(r);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const runCompetition = async () => {
    if (!competitorId) return;
    setError(null);
    try {
      const r = await competition.mutateAsync({
        project_id: projectId,
        competitor_id: competitorId,
      });
      onCreated?.(r);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const runUnified = async () => {
    setError(null);
    try {
      const r = await unified.mutateAsync({ project_id: projectId });
      onCreated?.(r);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const runNews = async () => {
    if (!topic.trim()) return;
    setError(null);
    try {
      const r = await news.mutateAsync({ project_id: projectId, topic: topic.trim() });
      if (r.report) onCreated?.({ id: r.report.id });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="relative">
      <Button onClick={() => setMenuOpen((v) => !v)}>
        <Icon name="add" className="text-[18px]" />
        Nuevo reporte
        <Icon name="expand_more" className="text-[18px]" />
      </Button>

      {menuOpen && (
        <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-auto sm:w-72 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden z-30">
          <MenuItem
            icon="hub"
            title="Análisis 360°"
            subtitle="Cruza marca + competidores + noticias + todo"
            onClick={() => openMode('unified')}
          />
          <MenuItem
            icon="groups"
            title="Análisis de competencia"
            subtitle="Consolida un competidor + sus posts"
            onClick={() => openMode('competition')}
          />
          <MenuItem
            icon="newspaper"
            title="Noticias del sector"
            subtitle="Rastreo de últimos 14 días"
            onClick={() => openMode('news')}
          />
          <MenuItem
            icon="psychology"
            title="Estrategia de marca"
            subtitle="Diagnóstico + iniciativas + métricas"
            onClick={() => openMode('brand')}
          />
          <MenuItem
            icon="calendar_month"
            title="Auditoría mensual"
            subtitle="Últimos 30 días del proyecto"
            onClick={() => openMode('audit')}
          />
        </div>
      )}

      <Dialog open={mode !== null} onOpenChange={(o) => { if (busy) return; if (!o) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'unified' && 'Análisis 360°'}
              {mode === 'competition' && 'Análisis de competencia'}
              {mode === 'news' && 'Noticias del sector'}
              {mode === 'brand' && 'Estrategia de marca'}
              {mode === 'audit' && 'Auditoría mensual'}
            </DialogTitle>
          </DialogHeader>

          {mode === 'unified' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Genera un análisis integral que cruza tu marca, competidores, noticias,
                recomendaciones activas y memoria del proyecto en un solo documento estratégico.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void runUnified()} disabled={busy}>
                  {unified.isPending && <Spinner className="h-4 w-4 mr-1" />}
                  Generar 360°
                </Button>
              </div>
            </div>
          )}

          {mode === 'competition' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Selecciona un competidor del proyecto.</p>
              <select
                value={competitorId}
                onChange={(e) => setCompetitorId(e.target.value)}
                className="flex h-12 w-full items-center justify-between rounded-2xl bg-slate-100 px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:bg-white"
              >
                <option value="">— Elige competidor —</option>
                {(competitors.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void runCompetition()} disabled={!competitorId || busy}>
                  {competition.isPending && <Spinner className="h-4 w-4 mr-1" />}
                  Generar
                </Button>
              </div>
            </div>
          )}

          {mode === 'news' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Escribe un tema a monitorear.</p>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej. Tendencias IA 2026"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void runNews()} disabled={!topic.trim() || busy}>
                  {news.isPending && <Spinner className="h-4 w-4 mr-1" />}
                  Generar
                </Button>
              </div>
            </div>
          )}

          {mode === 'brand' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Se tomará el BrandProfile y el Project actual para sintetizar un informe con 5
                secciones.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void runBrand()} disabled={busy}>
                  {brandStrategy.isPending && <Spinner className="h-4 w-4 mr-1" />}
                  Generar
                </Button>
              </div>
            </div>
          )}

          {mode === 'audit' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Consolidado de los últimos 30 días del proyecto.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={() => void runAudit()} disabled={busy}>
                  {audit.isPending && <Spinner className="h-4 w-4 mr-1" />}
                  Generar
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </DialogContent>
      </Dialog>
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
      className="w-full flex items-start gap-3 px-4 py-3 min-h-[48px] hover:bg-violet-50 transition-colors text-left"
    >
      <Icon name={icon} className="text-violet-600 text-[22px]" />
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </button>
  );
}
