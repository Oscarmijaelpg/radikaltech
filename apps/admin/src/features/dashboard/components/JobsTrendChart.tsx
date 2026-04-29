import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import type { JobsTrendPoint } from '../api/stats';

interface Props {
  data: JobsTrendPoint[];
}

const STATUS_COLOR: Record<string, string> = {
  succeeded: 'hsl(160 84% 39%)',
  failed: 'hsl(0 72% 51%)',
  running: 'hsl(188 92% 43%)',
  queued: 'hsl(215 16% 63%)',
};

const STATUS_LABEL: Record<string, string> = {
  succeeded: 'OK',
  failed: 'Fallidos',
  running: 'Corriendo',
  queued: 'En cola',
};

export function JobsTrendChart({ data }: Props) {
  const byDate = new Map<
    string,
    { date: string; succeeded: number; failed: number; running: number; queued: number }
  >();
  for (const row of data) {
    const key = row.date;
    if (!byDate.has(key)) {
      byDate.set(key, { date: key, succeeded: 0, failed: 0, running: 0, queued: 0 });
    }
    const entry = byDate.get(key)!;
    if (row.status === 'succeeded') entry.succeeded += row.count;
    else if (row.status === 'failed') entry.failed += row.count;
    else if (row.status === 'running') entry.running += row.count;
    else if (row.status === 'queued') entry.queued += row.count;
  }
  const chartData = Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, date: format(new Date(d.date), 'dd MMM') }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            stroke="hsl(215 16% 47%)"
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="succeeded"
            name={STATUS_LABEL.succeeded}
            stackId="jobs"
            fill={STATUS_COLOR.succeeded}
          />
          <Bar dataKey="running" name={STATUS_LABEL.running} stackId="jobs" fill={STATUS_COLOR.running} />
          <Bar dataKey="queued" name={STATUS_LABEL.queued} stackId="jobs" fill={STATUS_COLOR.queued} />
          <Bar
            dataKey="failed"
            name={STATUS_LABEL.failed}
            stackId="jobs"
            fill={STATUS_COLOR.failed}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
