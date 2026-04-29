import { Icon, Spinner } from '@radikal/ui';
import { clsx } from 'clsx';
import {
  useProvidersOverview,
  useProvidersFailures,
  type ProviderOverview,
} from '../api/providers';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integer = new Intl.NumberFormat('en-US');

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export function ProvidersPage() {
  const overviewQ = useProvidersOverview();
  const failuresQ = useProvidersFailures();

  const overviewItems = overviewQ.data ?? [];
  const failures = failuresQ.data;

  const totalCost = overviewItems.reduce((acc, r) => acc + r.costUsd, 0);
  const totalCalls = overviewItems.reduce((acc, r) => acc + r.calls, 0);
  const totalTokens = overviewItems.reduce((acc, r) => acc + r.totalTokens, 0);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black">Proveedores</h1>
        <p className="text-sm text-slate-500">
          Uso, costos y fallos de los servicios externos de IA (últimos 30 días).
        </p>
      </div>

      <SummaryCards
        loading={overviewQ.isLoading}
        totalCost={totalCost}
        totalCalls={totalCalls}
        totalTokens={totalTokens}
        failuresTotal={failures?.total ?? 0}
      />

      <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
        <header className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Icon name="receipt_long" className="text-[20px] text-slate-500" />
          <h2 className="font-display text-lg font-bold">Uso y costos por proveedor</h2>
        </header>
        {overviewQ.isLoading ? (
          <div className="py-12 grid place-items-center">
            <Spinner size="md" />
          </div>
        ) : overviewItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Sin registros de uso en los últimos 30 días.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-tighter text-slate-500">
                  <th className="px-4 sm:px-6 py-3">Proveedor</th>
                  <th className="px-4 py-3 text-right">Llamadas</th>
                  <th className="px-4 py-3 text-right">Tokens</th>
                  <th className="px-4 sm:px-6 py-3 text-right">Costo USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...overviewItems]
                  .sort((a, b) => b.costUsd - a.costUsd)
                  .map((row) => (
                    <OverviewRow key={row.provider} row={row} />
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 overflow-hidden">
        <header className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Icon name="error_outline" className="text-[20px] text-slate-500" />
          <h2 className="font-display text-lg font-bold">Errores recientes</h2>
        </header>
        {failuresQ.isLoading ? (
          <div className="py-12 grid place-items-center">
            <Spinner size="md" />
          </div>
        ) : !failures || failures.total === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Sin errores registrados en los últimos 30 días.
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <BreakdownList
                title="Por tipo de tarea"
                items={failures.byKind.map((b) => ({ label: b.kind, count: b.count }))}
              />
              <BreakdownList
                title="Por proveedor (inferido del mensaje)"
                items={failures.byProviderHint.map((b) => ({
                  label: b.provider,
                  count: b.count,
                }))}
              />
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-tighter text-slate-500 mb-2">
                Últimos 50 fallos
              </p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {failures.recent.map((r) => (
                  <div
                    key={r.id}
                    className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-start sm:gap-4"
                  >
                    <div className="shrink-0 flex items-center gap-2 sm:w-56 mb-1 sm:mb-0">
                      <span className="text-[11px] font-bold uppercase tracking-tight text-slate-700">
                        {r.kind}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatRelativeTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="flex-1 text-xs text-slate-600 break-words line-clamp-2">
                      {r.error ?? '(sin mensaje)'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface SummaryCardsProps {
  loading: boolean;
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  failuresTotal: number;
}

function SummaryCards({ loading, totalCost, totalCalls, totalTokens, failuresTotal }: SummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Gasto total"
        value={loading ? '…' : currency.format(totalCost)}
        icon="payments"
        accent="text-emerald-600"
      />
      <SummaryCard
        label="Llamadas"
        value={loading ? '…' : integer.format(totalCalls)}
        icon="call_made"
        accent="text-sky-600"
      />
      <SummaryCard
        label="Tokens"
        value={loading ? '…' : integer.format(totalTokens)}
        icon="token"
        accent="text-violet-600"
      />
      <SummaryCard
        label="Fallos"
        value={loading ? '…' : integer.format(failuresTotal)}
        icon="error"
        accent={failuresTotal > 0 ? 'text-rose-600' : 'text-slate-400'}
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon: string;
  accent: string;
}

function SummaryCard({ label, value, icon, accent }: SummaryCardProps) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tighter text-slate-500">
        <Icon name={icon} className={clsx('text-[18px]', accent)} />
        {label}
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function OverviewRow({ row }: { row: ProviderOverview }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 sm:px-6 py-3 font-semibold text-slate-800 capitalize">{row.provider}</td>
      <td className="px-4 py-3 text-right tabular-nums">{integer.format(row.calls)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
        {integer.format(row.totalTokens)}
      </td>
      <td className="px-4 sm:px-6 py-3 text-right tabular-nums font-semibold">
        {currency.format(row.costUsd)}
      </td>
    </tr>
  );
}

interface BreakdownListProps {
  title: string;
  items: Array<{ label: string; count: number }>;
}

function BreakdownList({ title, items }: BreakdownListProps) {
  const max = items.reduce((acc, i) => Math.max(acc, i.count), 0);
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-tighter text-slate-500 mb-3">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">Sin datos.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.label} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 shrink-0 w-24 sm:w-28 truncate capitalize">
                {i.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[hsl(var(--color-primary))]"
                  style={{ width: `${max > 0 ? (i.count / max) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-slate-600 shrink-0 w-10 text-right">
                {integer.format(i.count)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
