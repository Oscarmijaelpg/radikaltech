import { useState } from 'react';
import {
  Spinner,
  Switch,
  Badge,
  Button,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@radikal/ui';
import { Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import {
  useScheduledReports,
  useToggleScheduledReport,
  useRunScheduledReportNow,
} from '../api/scheduled-reports';
import { Pagination } from '@/shared/ui/Pagination';

export function ScheduledReportsPage() {
  const [filters, setFilters] = useState<Record<string, unknown>>({ page: 1, pageSize: 50 });
  const { data, isLoading, isFetching } = useScheduledReports(filters);
  const toggle = useToggleScheduledReport();
  const runNow = useRunScheduledReportNow();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const loadingBody = isFetching && !isLoading;

  const onFilterChange = (patch: Record<string, unknown>) => {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black">Reportes programados</h1>
        <p className="text-sm text-slate-500">
          Tareas recurrentes que generan reportes automáticos.
        </p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
          <Select
            value={(filters.kind as string) ?? 'all'}
            onValueChange={(v) => onFilterChange({ kind: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="news_digest">Noticias</SelectItem>
              <SelectItem value="competition_weekly">Competencia semanal</SelectItem>
              <SelectItem value="brand_monthly">Marca mensual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={(filters.frequency as string) ?? 'all'}
            onValueChange={(v) => onFilterChange({ frequency: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Frecuencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="daily">Diaria</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensual</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={(filters.enabled as string) ?? 'all'}
            onValueChange={(v) => onFilterChange({ enabled: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Pausados</SelectItem>
            </SelectContent>
          </Select>
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
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Activo</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Título</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Tipo</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Frecuencia</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Usuario</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">
                    Próxima ejecución
                  </th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Spinner />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-3">
                        <Switch
                          checked={r.enabled}
                          onCheckedChange={(enabled) => toggle.mutate({ id: r.id, enabled })}
                        />
                      </td>
                      <td className="py-3 font-medium">{r.title}</td>
                      <td className="py-3">
                        <Badge variant="muted">{r.kind}</Badge>
                      </td>
                      <td className="py-3 text-slate-600">{r.frequency}</td>
                      <td className="py-3 text-xs text-slate-500">{r.user.email}</td>
                      <td className="py-3 text-slate-500">
                        {format(new Date(r.nextRunAt), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runNow.mutate(r.id)}
                          disabled={runNow.isPending}
                        >
                          <Zap size={14} />
                          Ejecutar
                        </Button>
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
              rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-slate-500 truncate">{r.user.email}</div>
                    </div>
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(enabled) => toggle.mutate({ id: r.id, enabled })}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 items-center">
                    <Badge variant="muted">{r.kind}</Badge>
                    <span>{r.frequency}</span>
                    <span>·</span>
                    <span>{format(new Date(r.nextRunAt), 'dd MMM HH:mm')}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runNow.mutate(r.id)}
                    disabled={runNow.isPending}
                    className="w-full"
                  >
                    <Zap size={14} />
                    Ejecutar ya
                  </Button>
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
    </div>
  );
}
