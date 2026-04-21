import { useState } from 'react';
import { Users, FolderKanban, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Spinner } from '@radikal/ui';
import { useStatsOverview, useSignups, useJobsTrend } from '../api/stats';
import { StatCard } from '../components/StatCard';
import { DateRangePicker, defaultRange, type Range } from '../components/DateRangePicker';
import { SignupsChart } from '../components/SignupsChart';
import { JobsTrendChart } from '../components/JobsTrendChart';

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-MX').format(n);
}

export function DashboardPage() {
  const [range, setRange] = useState<Range>(defaultRange(30));
  const overview = useStatsOverview();
  const signups = useSignups(range);
  const jobsTrend = useJobsTrend(range);

  if (overview.isLoading) {
    return (
      <div className="p-4 sm:p-8 grid place-items-center h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <div className="p-4 sm:p-8">
        <div className="rounded-3xl bg-red-50 border border-red-100 p-6 text-red-700">
          Error cargando métricas:{' '}
          {overview.error instanceof Error ? overview.error.message : 'desconocido'}
        </div>
      </div>
    );
  }

  const o = overview.data;

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">Panel</h1>
          <p className="text-sm text-slate-500">Métricas globales de la plataforma.</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Usuarios totales"
          value={formatNumber(o.users.total)}
          hint={`+${o.users.new24h} últimas 24h · +${o.users.new7d} 7d`}
          icon={Users}
        />
        <StatCard
          label="Proyectos"
          value={formatNumber(o.projects.total)}
          hint={`${o.users.onboarded} con onboarding completo`}
          icon={FolderKanban}
        />
        <StatCard
          label="Tareas en ejecución"
          value={formatNumber(o.jobs.running)}
          hint={`${o.jobs.succeeded24h} ok · ${o.jobs.failed24h} fallidas (24h)`}
          icon={Cpu}
          tone={o.jobs.failed24h > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Tareas ok (24h)"
          value={formatNumber(o.jobs.succeeded24h)}
          icon={CheckCircle2}
          tone="positive"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="Tareas fallidas (24h)"
          value={formatNumber(o.jobs.failed24h)}
          icon={AlertTriangle}
          tone={o.jobs.failed24h > 0 ? 'negative' : 'default'}
        />
        <StatCard
          label="Onboarding completo"
          value={formatNumber(o.users.onboarded)}
          hint={`${Math.round((o.users.onboarded / Math.max(o.users.total, 1)) * 100)}% del total`}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="font-display text-lg font-black">Altas de usuarios</h3>
            <p className="text-xs text-slate-500">Rango seleccionado.</p>
          </div>
          {signups.isLoading ? (
            <div className="h-64 grid place-items-center">
              <Spinner />
            </div>
          ) : signups.data && signups.data.length > 0 ? (
            <SignupsChart data={signups.data} />
          ) : (
            <div className="h-64 grid place-items-center text-sm text-slate-400">
              Sin datos en el rango.
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="font-display text-lg font-black">Tareas por día</h3>
            <p className="text-xs text-slate-500">Distribución por estado.</p>
          </div>
          {jobsTrend.isLoading ? (
            <div className="h-64 grid place-items-center">
              <Spinner />
            </div>
          ) : jobsTrend.data && jobsTrend.data.length > 0 ? (
            <JobsTrendChart data={jobsTrend.data} />
          ) : (
            <div className="h-64 grid place-items-center text-sm text-slate-400">
              Sin tareas en el rango.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
