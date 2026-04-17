import { useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  Spinner,
} from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import {
  useScheduledReports,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useRunScheduledReportNow,
  type ScheduledReportFrequency,
  type ScheduledReportKind,
} from '../api/scheduled-reports';

const KIND_OPTIONS: Array<{ value: ScheduledReportKind; label: string }> = [
  { value: 'news_digest', label: 'Digest de noticias' },
  { value: 'competition_weekly', label: 'Competencia semanal' },
  { value: 'brand_monthly', label: 'Estrategia de marca mensual' },
  { value: 'custom', label: 'Custom' },
];

const FREQ_OPTIONS: Array<{ value: ScheduledReportFrequency; label: string }> = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
];

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  projectId: string;
}

export function ScheduledReportsSection({ projectId }: Props) {
  const confirmDialog = useConfirm();
  const q = useScheduledReports(projectId);
  const createMut = useCreateScheduledReport();
  const updateMut = useUpdateScheduledReport();
  const deleteMut = useDeleteScheduledReport();
  const runNowMut = useRunScheduledReportNow();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ScheduledReportKind>('brand_monthly');
  const [frequency, setFrequency] = useState<ScheduledReportFrequency>('weekly');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');

  const onSubmit = async () => {
    if (!title.trim()) return;
    const config: Record<string, unknown> = {};
    if (kind === 'news_digest' && topic.trim()) config.topic = topic.trim();
    await createMut.mutateAsync({
      project_id: projectId,
      kind,
      frequency,
      title: title.trim(),
      config,
    });
    setOpen(false);
    setTitle('');
    setTopic('');
    setKind('brand_monthly');
    setFrequency('weekly');
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-black text-base">Reportes programados</h3>
          <p className="text-xs text-slate-500">
            Automatiza la generación periódica de reportes.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo
        </Button>
      </div>

      {q.isLoading ? (
        <Skeleton className="h-20" />
      ) : (q.data ?? []).length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">
          Aún no tienes reportes programados.
        </p>
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).map((sr) => (
            <li
              key={sr.id}
              className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 p-3 rounded-xl border border-slate-200 bg-white"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{sr.title}</p>
                <p className="text-[11px] text-slate-500">
                  {KIND_OPTIONS.find((k) => k.value === sr.kind)?.label ?? sr.kind} ·{' '}
                  {FREQ_OPTIONS.find((f) => f.value === sr.frequency)?.label ?? sr.frequency}{' '}
                  · próx: {formatDate(sr.nextRunAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={updateMut.isPending}
                onClick={() =>
                  updateMut.mutate({
                    id: sr.id,
                    project_id: projectId,
                    patch: { enabled: !sr.enabled },
                  })
                }
                className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${
                  sr.enabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                } disabled:opacity-50`}
              >
                {updateMut.isPending ? (
                  <Spinner className="h-3 w-3" />
                ) : sr.enabled ? 'Activo' : 'Pausado'}
              </button>
              <button
                type="button"
                disabled={runNowMut.isPending}
                onClick={() => runNowMut.mutate({ id: sr.id, project_id: projectId })}
                className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 grid place-items-center"
                aria-label="Ejecutar ahora"
                title="Ejecutar ahora"
              >
                {runNowMut.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                )}
              </button>
              <button
                type="button"
                disabled={deleteMut.isPending}
                onClick={async () => {
                  const ok = await confirmDialog({ title: '¿Eliminar este reporte programado?', variant: 'danger', confirmLabel: 'Eliminar' });
                  if (!ok) return;
                  deleteMut.mutate({ id: sr.id, project_id: projectId });
                }}
                className="p-2 sm:p-1.5 rounded-lg hover:bg-red-50 text-red-600 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 grid place-items-center disabled:opacity-50"
                aria-label="Eliminar"
              >
                {deleteMut.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo reporte programado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                Título
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Auditoría mensual"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                Tipo
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ScheduledReportKind)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                Frecuencia
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ScheduledReportFrequency)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {kind === 'news_digest' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Tema (opcional)
                </label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej. marketing digital"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => void onSubmit()}
                disabled={!title.trim() || createMut.isPending}
              >
                {createMut.isPending && <Spinner className="h-4 w-4 mr-1" />}
                {createMut.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
