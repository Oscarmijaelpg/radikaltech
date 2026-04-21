import { useState } from 'react';
import {
  Spinner,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Button,
} from '@radikal/ui';
import { Download } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import {
  useAdminJobs,
  useJobKinds,
  type JobsFilters,
  type JobStatus,
  type AdminJob,
} from '../api/jobs';
import { JobStatusBadge } from '../components/JobStatusBadge';
import { JobDetailDrawer } from '../components/JobDetailDrawer';
import { Pagination } from '@/shared/ui/Pagination';
import { UserCombobox } from '@/shared/ui/UserCombobox';
import { api } from '@/lib/api';
import { qs } from '@/shared/lib/qs';
import { toCsv, downloadCsv } from '@/shared/lib/csv';
import { useToast } from '@/shared/ui/Toaster';

export function JobsPage() {
  const [filters, setFilters] = useState<JobsFilters>({ page: 1, pageSize: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, isFetching } = useAdminJobs(filters);
  const { data: kinds } = useJobKinds();

  const onExportCsv = async () => {
    setExporting(true);
    try {
      const all: AdminJob[] = [];
      let page = 1;
      const pageSize = 200;
      while (page <= 20) {
        const res = await api.get<{ data: AdminJob[]; meta: { totalPages: number } }>(
          `/admin/jobs${qs({ ...filters, page, pageSize })}`,
        );
        all.push(...res.data);
        if (page >= res.meta.totalPages) break;
        page += 1;
      }
      const csv = toCsv(all, [
        { key: 'id', label: 'ID tarea' },
        { key: 'kind', label: 'Tipo' },
        { key: 'status', label: 'Estado' },
        { key: 'userId', label: 'ID usuario' },
        { key: 'projectId', label: 'ID proyecto' },
        { key: 'error', label: 'Error' },
        { key: 'createdAt', label: 'Creado' },
        { key: 'startedAt', label: 'Iniciado' },
        { key: 'finishedAt', label: 'Finalizado' },
        { key: 'userEmail', label: 'Email usuario', get: (r) => r.user?.email ?? '' },
      ]);
      downloadCsv(`tareas-${Date.now()}.csv`, csv);
      toast({ variant: 'success', title: `Exportadas ${all.length} tareas` });
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

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const loadingBody = isFetching && !isLoading;

  const onFilterChange = (patch: Partial<JobsFilters>) => {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  };

  function duration(j: AdminJob): string {
    if (j.startedAt && j.finishedAt) {
      return `${Math.round(
        (new Date(j.finishedAt).getTime() - new Date(j.startedAt).getTime()) / 1000,
      )}s`;
    }
    return '—';
  }

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">Tareas</h1>
          <p className="text-sm text-slate-500">
            Tareas de IA · actualización automática cada 10s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onExportCsv} disabled={exporting}>
          <Download size={14} />
          <span className="hidden sm:inline">{exporting ? 'Exportando…' : 'Exportar CSV'}</span>
          <span className="sm:hidden">CSV</span>
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
          <div className="flex gap-2 flex-wrap">
            <Select
              value={filters.status ?? 'all'}
              onValueChange={(v) =>
                onFilterChange({ status: v === 'all' ? undefined : (v as JobStatus) })
              }
            >
              <SelectTrigger className="w-full flex-1 sm:flex-none sm:w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="queued">En cola</SelectItem>
                <SelectItem value="running">Corriendo</SelectItem>
                <SelectItem value="succeeded">Completados</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.kind ?? 'all'}
              onValueChange={(v) => onFilterChange({ kind: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="w-full flex-1 sm:flex-none sm:w-[240px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {(kinds ?? []).map((k) => (
                  <SelectItem key={k.kind} value={k.kind}>
                    {k.kind} ({k.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <UserCombobox
            value={filters.userId ?? null}
            onChange={(userId) => onFilterChange({ userId: userId ?? undefined })}
            placeholder="Todos los usuarios"
            className="w-full sm:flex-1 sm:min-w-[220px]"
          />
        </div>

        <div
          className={clsx(
            'transition-opacity',
            loadingBody && 'opacity-60 pointer-events-none',
          )}
        >
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Tipo</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Usuario</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Creado</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Duración</th>
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
                  rows.map((j) => (
                    <tr
                      key={j.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedId(j.id)}
                    >
                      <td className="py-3 font-medium">{j.kind}</td>
                      <td className="py-3">
                        <JobStatusBadge status={j.status} />
                      </td>
                      <td className="py-3 text-slate-500 text-xs">{j.user.email}</td>
                      <td className="py-3 text-slate-500">
                        {format(new Date(j.createdAt), 'dd MMM HH:mm')}
                      </td>
                      <td className="py-3 text-slate-500 text-xs">{duration(j)}</td>
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
              rows.map((j) => (
                <div
                  key={j.id}
                  className="rounded-2xl border border-slate-200 p-3 active:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedId(j.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{j.kind}</div>
                      <div className="text-xs text-slate-500 truncate">{j.user.email}</div>
                    </div>
                    <JobStatusBadge status={j.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span>{format(new Date(j.createdAt), 'dd MMM HH:mm')}</span>
                    <span>·</span>
                    <span>{duration(j)}</span>
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

      <JobDetailDrawer jobId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
