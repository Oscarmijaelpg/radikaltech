import { useMemo, useState } from 'react';
import {
  Spinner,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
} from '@radikal/ui';
import { Download } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useAuditLog, type AuditEntry } from '../api/audit';
import { Pagination } from '@/shared/ui/Pagination';
import { api } from '@/lib/api';
import { qs } from '@/shared/lib/qs';
import { toCsv, downloadCsv } from '@/shared/lib/csv';
import { useToast } from '@/shared/ui/Toaster';

interface AuditFilters {
  page: number;
  pageSize: number;
  action?: string;
  targetType?: string;
  actorEmail?: string;
  from?: string;
  to?: string;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function AuditPage() {
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, pageSize: 50 });
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, isFetching } = useAuditLog(filters);
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const loadingBody = isFetching && !isLoading;

  const onExportCsv = async () => {
    setExporting(true);
    try {
      const all: AuditEntry[] = [];
      let page = 1;
      const pageSize = 200;
      const MAX_PAGES = 20;
      let totalRecords = 0;
      while (page <= MAX_PAGES) {
        const res = await api.get<{ data: AuditEntry[]; meta: { totalPages: number; total: number } }>(
          `/admin/audit${qs({ ...filters, page, pageSize })}`,
        );
        all.push(...res.data);
        totalRecords = res.meta.total;
        if (page >= res.meta.totalPages) break;
        page += 1;
      }
      const csv = toCsv(all, [
        { key: 'createdAt', label: 'Cuándo' },
        { key: 'actorEmail', label: 'Email administrador' },
        { key: 'actorId', label: 'ID administrador' },
        { key: 'action', label: 'Acción' },
        { key: 'targetType', label: 'Tipo de objetivo' },
        { key: 'targetId', label: 'ID del objetivo' },
        { key: 'ip', label: 'IP' },
        { key: 'diff', label: 'Cambios' },
        { key: 'metadata', label: 'Detalles' },
      ]);
      downloadCsv(`historial-${Date.now()}.csv`, csv);
      const truncated = all.length < totalRecords;
      toast({
        variant: truncated ? 'warning' : 'success',
        title: truncated
          ? `Exportados ${all.length} de ${totalRecords} eventos (límite 4.000)`
          : `Exportados ${all.length} eventos`,
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al exportar',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const activePreset = useMemo(() => {
    if (!filters.from) return 'all';
    const days = Math.round(
      (Date.now() - new Date(filters.from).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days === 1) return '24h';
    if (days === 7) return '7d';
    if (days === 30) return '30d';
    return 'custom';
  }, [filters.from]);

  const applyPreset = (days: number | null) => {
    const from = days ? daysAgoIso(days) : undefined;
    setFilters((f) => ({ ...f, page: 1, from, to: undefined }));
    setFromDate('');
    setToDate('');
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({
      page: 1,
      pageSize: 50,
      action: action.trim() || undefined,
      targetType: targetType.trim() || undefined,
      actorEmail: actorEmail.trim() || undefined,
      from: fromDate ? new Date(fromDate).toISOString() : undefined,
      to: toDate ? new Date(toDate).toISOString() : undefined,
    });
  };

  const clearAll = () => {
    setAction('');
    setTargetType('');
    setActorEmail('');
    setFromDate('');
    setToDate('');
    setFilters({ page: 1, pageSize: 50 });
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">Historial de acciones</h1>
          <p className="text-sm text-slate-500">
            Registro de cambios hechos por administradores.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onExportCsv} disabled={exporting}>
          <Download size={14} />
          <span className="hidden sm:inline">{exporting ? 'Exportando…' : 'Exportar CSV'}</span>
          <span className="sm:hidden">CSV</span>
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: '24h', days: 1 },
            { label: '7d', days: 7 },
            { label: '30d', days: 30 },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.days)}
              className={
                activePreset === p.label
                  ? 'px-3 py-1.5 text-sm rounded-lg bg-primary text-white font-medium'
                  : 'px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyPreset(null)}
            className={
              activePreset === 'all'
                ? 'px-3 py-1.5 text-sm rounded-lg bg-primary text-white font-medium'
                : 'px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200'
            }
          >
            Todo
          </button>
        </div>

        <form onSubmit={applyFilters} className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
          <Input
            placeholder="Acción (ej. user.delete)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-[180px]"
          />
          <Input
            placeholder="Tipo de objetivo"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-[180px]"
          />
          <Input
            placeholder="Email del administrador"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            className="w-full sm:flex-1 sm:min-w-[180px]"
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="flex-1 sm:w-[150px]"
              placeholder="Desde"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="flex-1 sm:w-[150px]"
              placeholder="Hasta"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1 sm:flex-none">
              Aplicar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="flex-1 sm:flex-none"
            >
              Limpiar
            </Button>
          </div>
        </form>

        <div
          className={clsx('transition-opacity', loadingBody && 'opacity-60 pointer-events-none')}
        >
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Cuándo</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">
                    Administrador
                  </th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Acción</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Objetivo</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">
                    ID objetivo
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Spinner />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  rows.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelected(a)}
                    >
                      <td className="py-3 text-slate-500 text-xs">
                        {format(new Date(a.createdAt), 'dd MMM yyyy HH:mm:ss')}
                      </td>
                      <td className="py-3 text-xs">{a.actorEmail ?? a.actorId.slice(0, 8)}</td>
                      <td className="py-3">
                        <Badge variant="muted">{a.action}</Badge>
                      </td>
                      <td className="py-3 text-slate-600">{a.targetType}</td>
                      <td className="py-3 text-xs text-slate-400 font-mono">
                        {a.targetId?.slice(0, 8) ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {isLoading ? (
              <div className="py-12 grid place-items-center">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Sin resultados.</div>
            ) : (
              rows.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-slate-200 p-3 active:bg-slate-50 cursor-pointer"
                  onClick={() => setSelected(a)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="muted">{a.action}</Badge>
                    <span className="text-xs text-slate-500 shrink-0">
                      {format(new Date(a.createdAt), 'dd MMM HH:mm')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    {a.actorEmail ?? a.actorId.slice(0, 8)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {a.targetType} {a.targetId ? `· ${a.targetId.slice(0, 8)}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {meta && (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            isFetching={isFetching}
            onChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selected && (
            <div className="space-y-4">
              <div>
                <DialogTitle>{selected.action}</DialogTitle>
                <DialogDescription>
                  {format(new Date(selected.createdAt), 'dd MMM yyyy HH:mm:ss')} ·{' '}
                  {selected.actorEmail ?? selected.actorId}
                </DialogDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Info label="Tipo de objetivo" value={selected.targetType} />
                <Info label="ID del objetivo" value={selected.targetId ?? '—'} />
                <Info label="IP" value={selected.ip ?? '—'} />
                <Info
                  label="Navegador"
                  value={<span className="text-xs">{selected.userAgent ?? '—'}</span>}
                />
              </div>

              {!!selected.diff && (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Cambios</div>
                  <pre className="text-xs whitespace-pre-wrap max-h-72 overflow-y-auto custom-scrollbar">
                    {JSON.stringify(selected.diff, null, 2)}
                  </pre>
                </div>
              )}

              {!!selected.metadata && (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                    Detalles
                  </div>
                  <pre className="text-xs whitespace-pre-wrap max-h-72 overflow-y-auto custom-scrollbar">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
