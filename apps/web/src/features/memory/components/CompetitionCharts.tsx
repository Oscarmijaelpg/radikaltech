import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQueries } from '@tanstack/react-query';
import { Card, SectionTitle, Spinner } from '@radikal/ui';
import { api } from '@/lib/api';
import { type CompetitorStats, type SocialPostItem } from '../api/memory';
import { useCompetitors } from '../api/memory';

const COLORS = [
  'hsl(327, 100%, 51%)',
  'hsl(182, 53%, 50%)',
  'hsl(217, 91%, 60%)',
  'hsl(142, 70%, 45%)',
  'hsl(25, 100%, 50%)',
  'hsl(280, 67%, 55%)',
  'hsl(45, 100%, 50%)',
];

function colorFor(_name: string, idx: number) {
  return COLORS[idx % COLORS.length] ?? '#888';
}

interface Props {
  projectId: string;
  competitorIds: string[];
}

export function CompetitionCharts({ projectId, competitorIds }: Props) {
  const { data: competitors } = useCompetitors(projectId);

  const statsQueries = useQueries({
    queries: competitorIds.map((id) => ({
      queryKey: ['competitor-stats', id],
      queryFn: async () => {
        const r = await api.get<{ data: CompetitorStats }>(`/competitors/${id}/stats`);
        return r.data;
      },
      enabled: !!id,
    })),
  });

  const postsQueries = useQueries({
    queries: competitorIds.map((id) => ({
      queryKey: ['competitor-posts', id, null, 30],
      queryFn: async () => {
        const r = await api.get<{ data: SocialPostItem[] }>(`/competitors/${id}/posts?limit=30`);
        return r.data;
      },
      enabled: !!id,
    })),
  });

  const loadingStats = statsQueries.some((q) => q.isLoading);
  const loadingPosts = postsQueries.some((q) => q.isLoading);
  const stats: CompetitorStats[] = statsQueries
    .map((q) => q.data)
    .filter((d): d is CompetitorStats => !!d);
  const postsById: Record<string, SocialPostItem[]> = {};
  competitorIds.forEach((id, i) => {
    postsById[id] = postsQueries[i]?.data ?? [];
  });

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    (competitors ?? []).forEach((c) => {
      m[c.id] = c.name;
    });
    return m;
  }, [competitors]);

  const engagementData = useMemo(
    () =>
      stats.map((s, i) => ({
        name: nameById[s.competitor_id] ?? s.competitor_name,
        avgEngagement: Math.round(s.avg_engagement),
        fill: colorFor(s.competitor_name, i),
      })),
    [stats, nameById],
  );

  const volumeData = useMemo(() => {
    const cutoff = Date.now() - 28 * 86_400_000;
    return competitorIds.map((id, i) => {
      const posts = postsById[id] ?? [];
      const count = posts.filter((p) => {
        if (!p.posted_at) return false;
        return new Date(p.posted_at).getTime() >= cutoff;
      }).length;
      return {
        name: nameById[id] ?? 'Competidor',
        count,
        fill: colorFor(nameById[id] ?? '', i),
      };
    });
  }, [competitorIds, postsById, nameById]);

  const formatMixData = useMemo(() => {
    const agg: Record<string, number> = {};
    stats.forEach((s) => {
      Object.entries(s.format_mix ?? {}).forEach(([k, v]) => {
        const key = k || 'unknown';
        agg[key] = (agg[key] ?? 0) + v;
      });
    });
    return Object.entries(agg).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const scatterData = useMemo(() => {
    return competitorIds.flatMap((id, i) => {
      const color = colorFor(nameById[id] ?? '', i);
      return (postsById[id] ?? []).map((p) => ({
        x: p.likes,
        y: p.comments,
        z: p.views || 50,
        postUrl: p.post_url,
        caption: p.caption,
        competitor: nameById[id] ?? 'Competidor',
        fill: color,
      }));
    });
  }, [competitorIds, postsById, nameById]);

  if (loadingStats || loadingPosts) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Spinner />
      </Card>
    );
  }

  if (competitorIds.length === 0 || stats.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Engagement promedio por post</h3>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-4">
          Likes + comentarios x3 + shares x5 / posts
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={engagementData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-chart-grid))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="avgEngagement" radius={[6, 6, 0, 0]}>
              {engagementData.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Volumen total últimas 4 semanas</h3>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-4">
          Posts publicados
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={volumeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-chart-grid))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {volumeData.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Mezcla de formatos</h3>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-4">
          Video / imagen / carousel
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={formatMixData} dataKey="value" nameKey="name" outerRadius={100} label>
              {formatMixData.map((_, i) => (
                <Cell key={i} fill={colorFor('fmt', i)} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Posts individuales</h3>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-4">
          Likes vs. comentarios — click para abrir
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-chart-grid))" />
            <XAxis type="number" dataKey="x" name="likes" tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="comments" tick={{ fontSize: 11 }} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0]?.payload as (typeof scatterData)[number] | undefined;
                if (!p) return null;
                return (
                  <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xl max-w-xs">
                    <SectionTitle className="text-slate-400">
                      {p.competitor}
                    </SectionTitle>
                    {p.caption && (
                      <p className="text-xs text-slate-700 mt-1 line-clamp-3">{p.caption}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-2">
                      <strong>{p.x}</strong> likes · <strong>{p.y}</strong> comentarios
                    </p>
                  </div>
                );
              }}
            />
            <Scatter
              data={scatterData}
              onClick={(d: { postUrl?: string }) => {
                if (d?.postUrl) window.open(d.postUrl, '_blank');
              }}
            >
              {scatterData.map((d, i) => (
                <Cell key={i} fill={d.fill} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
