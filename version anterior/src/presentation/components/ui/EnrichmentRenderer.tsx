import React from 'react';
import { Card } from './Card';

interface EnrichmentRendererProps {
  enrichment: any;
}

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

interface EnrichmentRendererProps {
  enrichment: any;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const EnrichmentRenderer: React.FC<EnrichmentRendererProps> = ({ enrichment }) => {
  let data: any;
  try {
    data = JSON.parse(enrichment.content);
  } catch (e) {
    return null;
  }

  if (data.type === 'infographic') {
    return (
      <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="group relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm hover:shadow-md transition-all">
          <img 
            src={data.url} 
            alt="Infografía" 
            className="w-full h-auto object-cover max-h-[600px] hover:scale-105 transition-transform duration-1000" 
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))] shadow-sm">
              Infografía Generada
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (data.type === 'chart') {
    const { chartData } = data;
    if (!chartData) return null;

    // Transform data for Recharts
    // From: { labels: [], datasets: [{ label: '', data: [] }] }
    // To: [ { name: label, series1: val, series2: val } ]
    const rechartsData = chartData.labels.map((label: string, idx: number) => {
      const entry: any = { name: label };
      chartData.datasets.forEach((ds: any) => {
        entry[ds.label] = Number(ds.data[idx]);
      });
      return entry;
    });

    const seriesKeys = chartData.datasets.map((ds: any) => ds.label);

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-slate-900 text-white p-3 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-white/10 pb-1">{label}</p>
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between gap-6 py-0.5 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs font-medium">{entry.name}:</span>
                </div>
                <span className="text-xs font-bold text-[hsl(var(--color-primary))]">{entry.value}</span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    const renderChart = () => {
      switch (chartData.chartType) {
        case 'pie':
          // Recharts Pie needs data in [ { name: '', value: 0 } ]
          const pieData = chartData.labels.map((l: string, i: number) => ({
            name: l,
            value: Number(chartData.datasets[0].data[i])
          }));
          return (
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="rgba(255,255,255,0.2)" />
                    ))}
                  </Pie>
                  <ReTooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );

        case 'radar':
          return (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={rechartsData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                  {seriesKeys.map((key: string, idx: number) => (
                    <Radar
                      key={key}
                      name={key}
                      dataKey={key}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={0.4}
                    />
                  ))}
                  <ReTooltip content={<CustomTooltip />} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          );

        case 'bar':
        default:
          return (
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rechartsData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    interval={0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <ReTooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" />
                  {seriesKeys.map((key: string, idx: number) => (
                    <Bar 
                      key={key} 
                      name={key}
                      dataKey={key} 
                      fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                      radius={[4, 4, 0, 0]} 
                      barSize={seriesKeys.length > 1 ? undefined : 40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
      }
    };

    return (
      <Card className="mt-6 p-6 md:p-8 border-slate-100 bg-white shadow-xl rounded-[2rem] animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-800 text-lg">{chartData.title}</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">Análisis Comparativo Visual</p>
          </div>
          <span className="px-3 py-1 bg-[hsl(var(--color-primary)/0.05)] rounded-full text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))] self-start">
            {chartData.chartType === 'pie' ? 'Sectores' : chartData.chartType === 'radar' ? 'Radar Estratégico' : 'Barras Comparativas'}
          </span>
        </div>
        
        {renderChart()}
      </Card>
    );
  }

  return null;
};
