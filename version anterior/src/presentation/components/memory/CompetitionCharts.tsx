
import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../infrastructure/supabase/client';

interface CompetitionChartsProps {
  data: any;
  memoryId?: string;
  onSave?: (chart: any) => void;
  savedIds?: Set<string>;
  hideHeader?: boolean;
}

export const CompetitionCharts: React.FC<CompetitionChartsProps> = ({ data, memoryId, onSave, savedIds, hideHeader }) => {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, targetKey?: string }>({ 
    isOpen: false 
  });

  const stats = useMemo(() => {
    try {
      let s = typeof data === 'string' ? JSON.parse(data) : data;
      if (s.item?.json) s = s.item.json;
      if (Array.isArray(s) && s[0]?.json) s = s[0].json;
      return s || {};
    } catch (e) {
      console.error('Error parsing stats JSON:', e);
      return {};
    }
  }, [data]);

  const primaryColor = 'hsl(327, 100%, 51%)';
  const competitorPalette = [
    'hsl(182, 53%, 50%)', 'hsl(217, 91%, 60%)', 'hsl(142, 70%, 45%)',
    'hsl(25, 100%, 50%)', 'hsl(280, 67%, 55%)', 'hsl(45, 100%, 50%)'
  ];

  const dynamicCharts = useMemo(() => {
    let list: any[] = [];
    
    // N8N Workflow Format Detection
    const getn8nCharts = (n8nData: any) => {
      const generated: any[] = [];
      if (n8nData.chart1_engagement_by_company) {
        generated.push({
          id: 'chart1',
          type: 'bar',
          title: 'Engagement Promedio Comparativo',
          subtitle: 'Comparación del rendimiento por post de cada cuenta',
          interpretation: 'La empresa del usuario (' + (n8nData.meta?.myCompanyDisplayName || 'Mi Empresa') + ') se resalta en color. Muestra quién genera más impacto en promedio.',
          data: n8nData.chart1_engagement_by_company,
          config: {
            layout: 'horizontal',
            xAxis: 'companyName',
            yAxis: 'avgEngagementPerPost',
            fields: [
              { key: 'avgEngagementPerPost', label: 'Engagement Medio', format: 'number' },
              { key: 'avgLikesPerPost', label: 'Likes Medios', format: 'number' },
              { key: 'avgCommentsPerPost', label: 'Comentarios Medios', format: 'number' }
            ]
          }
        });
      }
      if (n8nData.chart2_engagement_rate_by_company) {
         // This might have null values depending on followers, so we fallback or skip
         const hasData = n8nData.chart2_engagement_rate_by_company.some((d: any) => d.totalEngagement != null);
         if (hasData) {
           generated.push({
             id: 'chart2',
             type: 'bar',
             title: 'Volumen Total de Interacciones',
             subtitle: 'Engagement acumulado en las últimas 4 semanas',
             data: n8nData.chart2_engagement_rate_by_company,
             config: {
               layout: 'horizontal',
               xAxis: 'companyName',
               yAxis: 'totalEngagement',
               fields: [
                 { key: 'totalEngagement', label: 'Interacciones Totales', format: 'number' },
                 { key: 'postsCount', label: 'Total Posts', format: 'number' }
               ]
             }
           });
         }
      }
      if (n8nData.chart3_engagement_by_type) {
        generated.push({
          id: 'chart3',
          type: 'bar',
          title: 'Rendimiento por Formato',
          subtitle: 'Qué tipo de contenido funciona mejor',
          data: n8nData.chart3_engagement_by_type,
          config: {
            layout: 'horizontal',
            xAxis: 'companyName',
            yAxis: 'avgEngagementPerPost',
            fields: [
              { key: 'avgEngagementPerPost', label: 'Engagement X Post', format: 'number' }
            ]
          }
        });
      }
      if (n8nData.chart4_scatter_likes_comments) {
        generated.push({
          id: 'chart4',
          type: 'scatter',
          title: 'Engagement por Post (Scatter)',
          subtitle: 'Todos los posts graficados individualmente. Selecciona para ir al enlace.',
          data: n8nData.chart4_scatter_likes_comments,
          config: {
            xAxis: 'likesCount',
            yAxis: 'commentsCount',
            fields: [
              { key: 'likesCount', label: 'Likes', format: 'number' },
              { key: 'commentsCount', label: 'Comentarios', format: 'number' }
            ]
          }
        });
      }
      return generated;
    };

    if (Array.isArray(stats)) {
      if (stats.length > 0 && stats[0].chart1_engagement_by_company) {
        list = getn8nCharts(stats[0]);
      } else {
        list = stats;
      }
    } else if (stats.chart1_engagement_by_company) {
      list = getn8nCharts(stats);
    } else if (stats.type && stats.data) {
      // Single saved chart object
      list = [stats];
    } else {
      // Just in case it's nested somehow else
      const possibleArray = Object.values(stats).find(v => Array.isArray(v));
      if (possibleArray) list = possibleArray as any[];
    }
    
    // Ensure all items in list match the expected format to avoid crash
    return list.filter(item => item && item.type && item.data);
  }, [stats]);

  if (dynamicCharts.length === 0) return null;

  const handleDelete = async () => {
    if (!memoryId) return;
    try {
      if (confirmDelete.targetKey) {
        const updatedStats = { ...stats };
        if (updatedStats.charts) {
          updatedStats.charts = updatedStats.charts.filter((c: any) => c.id !== confirmDelete.targetKey);
        }
        delete updatedStats[confirmDelete.targetKey];
        
        const remainingKeys = Object.keys(updatedStats).filter(k => k.startsWith('chart') || k === 'charts');
        if (remainingKeys.length === 0 || (updatedStats.charts && updatedStats.charts.length === 0)) {
          await supabase.from('memory_resources').delete().eq('id', memoryId);
        } else {
          await supabase.from('memory_resources').update({ content: JSON.stringify(updatedStats) }).eq('id', memoryId);
        }
      } else {
        await supabase.from('memory_resources').delete().eq('id', memoryId);
      }
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      setConfirmDelete({ isOpen: false });
    } catch (e) { console.error('Error deleting chart:', e); }
  };

  const getCompanyColor = (name: string, isMy?: boolean) => {
    if (isMy) return primaryColor;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % competitorPalette.length;
    return competitorPalette[index];
  };

  const CustomTooltip = ({ active, payload, label, fields }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xl space-y-3 max-w-[280px]">
          <p className="font-black text-slate-900 border-b border-slate-100 pb-2 truncate flex items-center justify-between gap-2">
            <span>{p.companyName || label || 'Dato'}</span>
            {p.isMyCompany && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest">
                Mi Empresa
              </span>
            )}
          </p>
          <div className="space-y-1">
            {fields && fields.length > 0 ? fields.map((field: any) => {
              const val = p[field.key];
              if (val === undefined || val === null) return null;
              
              let displayVal = val;
              try {
                if (typeof val === 'number') {
                   displayVal = field.format === 'percent' 
                     ? `${(val * 100).toFixed(2)}%` 
                     : val.toLocaleString();
                } else if (typeof val === 'string' && !isNaN(Number(val))) {
                   const numVal = Number(val);
                   displayVal = field.format === 'percent' 
                     ? `${(numVal * 100).toFixed(2)}%` 
                     : numVal.toLocaleString();
                }
              } catch (e) {
                displayVal = String(val);
              }

              return (
                <p key={field.key} className="text-[11px] text-slate-600 flex justify-between gap-4">
                  <span className="font-semibold text-slate-400 uppercase tracking-tighter shrink-0">{field.label}:</span>
                  <span className="font-bold text-slate-700">{displayVal}</span>
                </p>
              );
            }) : (
              /* 2. Fallback: Mostrar métricas comunes si no hay fields */
              <>
                {p.likes !== undefined && (
                  <p className="text-[11px] text-slate-600 flex justify-between gap-4">
                    <span className="font-semibold text-slate-400 uppercase tracking-tighter shrink-0">Likes:</span>
                    <span className="font-bold text-slate-700">{p.likes.toLocaleString()}</span>
                  </p>
                )}
                {p.comments !== undefined && (
                  <p className="text-[11px] text-slate-600 flex justify-between gap-4">
                    <span className="font-semibold text-slate-400 uppercase tracking-tighter shrink-0">Comentarios:</span>
                    <span className="font-bold text-slate-700">{p.comments.toLocaleString()}</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-2 duration-700 min-h-[500px]">
      {!hideHeader && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))]">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Benchmark de Inteligencia Social</h2>
              <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">Rendimiento Estratégico Real</p>
            </div>
          </div>
          <button 
            onClick={() => setConfirmDelete({ isOpen: true })}
            className="px-4 py-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Borrar todo el bloque
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {dynamicCharts.map((chart, idx) => (
          <Card key={chart.id || idx} className={`p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow min-h-[500px] group relative flex flex-col ${chart.type === 'scatter' || chart.id === 'chart1' || chart.config?.layout === 'horizontal' ? 'lg:col-span-2' : ''}`}>
            <div className="flex justify-between items-start mb-6 gap-4">
              <div className="flex-1 pr-4">
                <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span className="w-2 h-6 rounded-full" style={{ backgroundColor: chart.type === 'bar' ? 'hsl(var(--color-primary))' : 'hsl(var(--color-secondary))' }}></span>
                  {chart.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium italic">{chart.subtitle}</p>
              </div>

              <div className={`flex gap-2 transition-opacity shrink-0 ${savedIds?.has(`${memoryId}-${chart.id || ''}`) ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                 {onSave && (
                   <Button
                     size="sm"
                     variant={savedIds?.has(`${memoryId}-${chart.id || ''}`) ? "secondary" : "primary"}
                     onClick={(e) => { e.stopPropagation(); onSave(chart); }}
                     icon={<span className="material-symbols-outlined text-sm">{savedIds?.has(`${memoryId}-${chart.id || ''}`) ? 'bookmark_added' : 'bookmark'}</span>}
                   >
                     {savedIds?.has(`${memoryId}-${chart.id || ''}`) ? 'Guardado' : 'Guardar'}
                   </Button>
                 )}
                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, targetKey: chart.id }); }}
                  className="hover:border-red-200 hover:text-red-500 hover:bg-red-50"
                  icon={<span className="material-symbols-outlined text-sm">delete</span>}
                >
                  Borrar
                </Button>
              </div>
            </div>
            
            <div className="flex-1 min-h-[350px]" style={{ height: chart.type === 'scatter' ? 400 : 350 }}>
              {!chart.data || chart.data.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-50 rounded-2xl">
                  <span className="material-symbols-outlined text-4xl">query_stats</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">No hay datos suficientes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={chart.type === 'scatter' ? 400 : 350}>
                  {chart.type === 'bar' ? (
                    <BarChart 
                      data={chart.data} 
                      layout={chart.config.layout || 'horizontal'} 
                      margin={{ 
                        left: chart.config.layout === 'vertical' ? 60 : 10, 
                        right: 30, 
                        top: 10, 
                        bottom: chart.config.layout === 'vertical' ? 10 : 40 
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                         type={chart.config.layout === 'vertical' ? 'number' : 'category'} 
                         dataKey={chart.config.layout === 'vertical' ? undefined : chart.config.xAxis}
                         tick={{ fontSize: 10, fontWeight: 'bold' }}
                         hide={false}
                         label={chart.config.layout === 'horizontal' ? { value: chart.config.xAxis ? chart.config.xAxis.toUpperCase() : '', position: 'insideBottom', offset: -5, fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' } : undefined}
                      />
                      <YAxis 
                         type={chart.config.layout === 'vertical' ? 'category' : 'number'}
                         dataKey={chart.config.layout === 'vertical' ? chart.config.yAxis : undefined} 
                         tick={{ fontSize: 10, fontWeight: 'medium' }}
                         width={chart.config.layout === 'vertical' ? 140 : 60}
                         label={chart.config.layout === 'vertical' ? { value: chart.config.yAxis ? chart.config.yAxis.toUpperCase() : '', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' } : undefined}
                      />
                      <Tooltip content={<CustomTooltip fields={chart.config.fields || []} />} />
                      {/* @ts-ignore */}
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}
                        payload={[
                          { value: 'Mi Empresa', type: 'circle', id: 'my', color: primaryColor },
                          { value: 'Competencia', type: 'circle', id: 'comp', color: competitorPalette[1] }
                        ] as any}
                      />
                      {/* Generar una barra por cada campo métrico definido en el gráfico */}
                      {(chart.config.fields && chart.config.fields.length > 0 ? chart.config.fields : [{ key: chart.config.layout === 'vertical' ? chart.config.xAxis : chart.config.yAxis }]).map((field: any, fIdx: number) => (
                        <Bar 
                          key={field.key || fIdx}
                          dataKey={field.key} 
                          name={field.label || field.key}
                          radius={chart.config.layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]} 
                          barSize={chart.config.layout === 'vertical' ? 18 : 30}
                        >
                          {chart.data.map((entry: any, index: number) => {
                            const entryName = entry.companyName || entry.tipo || entry.type || entry[chart.config.xAxis] || entry[chart.config.yAxis] || 'Dato';
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={fIdx > 0 ? competitorPalette[(index + fIdx) % competitorPalette.length] : getCompanyColor(entryName, entry.isMyCompany)} 
                              />
                            );
                          })}
                        </Bar>
                      ))}
                    </BarChart>
                  ) : (
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" dataKey="_jitterX" name="X" tick={{ fontSize: 10 }} label={{ value: chart.config.xAxis ? chart.config.xAxis.toUpperCase() : 'X', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 'bold', fill: '#64748b' }} />
                      <YAxis type="number" dataKey="_jitterY" name="Y" tick={{ fontSize: 10 }} label={{ value: chart.config.yAxis ? chart.config.yAxis.toUpperCase() : 'Y', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 'bold', fill: '#64748b' }} />
                      <ZAxis type="number" dataKey={chart.config.zAxis || 'engagement'} range={[100, 600]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip fields={chart.config.fields || []} />} />
                      <Scatter 
                        data={chart.data.map((d: any) => ({
                          ...d,
                          _jitterX: d[chart.config.xAxis] !== undefined ? d[chart.config.xAxis] + (Math.random() - 0.5) * (Math.max(1, d[chart.config.xAxis] * 0.05)) : 0,
                          _jitterY: d[chart.config.yAxis] !== undefined ? d[chart.config.yAxis] + (Math.random() - 0.5) * (Math.max(1, d[chart.config.yAxis] * 0.05)) : 0
                        }))} 
                        onClick={(d: any) => {
                          const url = d?.payload?.postUrl || d?.postUrl || d?.url || d?.payload?.url;
                          if (url && !url.includes('example')) window.open(url, '_blank');
                        }}
                        className="cursor-pointer"
                      >
                        {chart.data.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getCompanyColor(entry.companyName || 'Empresa', entry.isMyCompany)} 
                            fillOpacity={0.7}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  )}
                </ResponsiveContainer>
              )}

              {chart.type === 'scatter' && chart.data && chart.data.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-6 items-center justify-center border-t border-slate-100 pt-4 pb-2">
                  {Array.from(new Set(chart.data.map((d: any) => d.companyName || 'Empresa'))).map((comp: any) => {
                    const isMy = chart.data.find((d: any) => (d.companyName || 'Empresa') === comp)?.isMyCompany;
                    return (
                      <div key={comp} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: getCompanyColor(comp, isMy) }} />
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">{comp}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {chart.interpretation && (
              <div className="mt-4 pt-4 border-t border-slate-50">
                <p className="text-[10px] leading-relaxed text-slate-400 uppercase font-black tracking-widest">Interpretación:</p>
                <p className="text-xs text-slate-600 mt-1">{chart.interpretation}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false })}
        title="Confirmar Eliminación"
      >
        <div className="p-6 space-y-6 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl text-red-500">delete_forever</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">¿Estás seguro?</h3>
            <p className="text-sm text-slate-500">
              Esta acción no se puede deshacer. Se eliminará {confirmDelete.targetKey ? 'este gráfico' : 'todo el bloque de análisis'}.
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete({ isOpen: false })}>
              Cancelar
            </Button>
            <Button variant="primary" className="flex-1 bg-red-500 hover:bg-red-600 border-red-500" onClick={handleDelete}>
              Sí, Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
