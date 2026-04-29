import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

interface FunnelStep {
  step: string;
  value: number;
}

interface FunnelChartProps {
  data: FunnelStep[];
  isLoading?: boolean;
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ data, isLoading = false }) => {
  if (isLoading) return <SkeletonLoader className="h-48" />;
  if (!data || data.length === 0) return <EmptyState />;

  const maxVal = Math.max(...data.map(d => d.value));

  return (
    <div className="card-premium p-6">
      <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Conversión de Funnel</h3>
      <div className="flex flex-col gap-4">
        {data.map((item, index) => {
          const widthPercent = (item.value / maxVal) * 100;
          const nextVal = data[index + 1]?.value;
          const dropOff = nextVal ? Math.round(((item.value - nextVal) / item.value) * 100) : null;
          
          return (
            <div key={item.step} className="group flex items-center gap-4">
              <div className="w-24 text-right text-sm font-medium text-slate-600 dark:text-slate-400 truncate">
                {item.step}
              </div>
              <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-r-lg rounded-l-sm overflow-hidden relative flex items-center">
                <div 
                  className="h-full bg-gradient-to-r from-[hsl(var(--color-primary)/0.8)] to-[hsl(var(--color-primary))] transition-all duration-1000 ease-out flex items-center px-4"
                  style={{ width: `${widthPercent}%` }}
                >
                  <span className="text-white text-xs font-bold drop-shadow-sm">{item.value.toLocaleString()}</span>
                </div>
                {widthPercent < 15 && (
                  <span className="absolute left-full ml-2 text-slate-700 dark:text-slate-300 text-xs font-bold">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>
              {dropOff !== null && (
                 <div className="w-16 text-xs text-rose-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                   -{dropOff}%
                 </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
