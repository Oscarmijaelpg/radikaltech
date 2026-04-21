import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import type { SignupPoint } from '../api/stats';

interface Props {
  data: SignupPoint[];
}

export function SignupsChart({ data }: Props) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.date), 'dd MMM'),
    count: d.count,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="signupsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(327 100% 51%)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(327 100% 51%)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(327 100% 51%)"
            fill="url(#signupsGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
