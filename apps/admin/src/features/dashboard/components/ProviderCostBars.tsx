import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TokenUsageRow } from '../api/stats';

interface Props {
  data: TokenUsageRow[];
}

export function ProviderCostBars({ data }: Props) {
  const byProvider = new Map<string, number>();
  for (const r of data) byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + r.costUsd);
  const rows = Array.from(byProvider.entries())
    .map(([provider, costUsd]) => ({ provider, costUsd: Number(costUsd.toFixed(4)) }))
    .sort((a, b) => b.costUsd - a.costUsd);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
          <XAxis dataKey="provider" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
          <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
          <Bar dataKey="costUsd" fill="hsl(182 53% 50%)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
