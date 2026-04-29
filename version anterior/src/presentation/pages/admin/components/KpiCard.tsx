import React from 'react';
import { FrequencyBadge } from './FrequencyBadge';
import { SkeletonLoader } from './SkeletonLoader';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  isPositive?: boolean;
  freq?: 'EN VIVO' | 'DIARIO' | 'SEMANAL' | 'MENSUAL';
  isLoading?: boolean;
  isConnected?: boolean;
  onClick?: () => void;
  className?: string;
  large?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  delta,
  isPositive = true,
  freq,
  isLoading = false,
  isConnected = false,
  onClick,
  className = '',
  large = false,
}) => {
  if (isLoading) {
    return <SkeletonLoader className={`w-full ${large ? 'h-40' : 'h-32'}`} />;
  }

  return (
    <div 
      onClick={onClick}
      className={`card-premium relative overflow-hidden group transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-[hsl(var(--color-primary)/0.5)] hover:shadow-2xl active:scale-[0.98]' : ''} ${className}`}
    >
      {/* Decorative background gradient element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--color-primary)/0.03)] dark:bg-[hsl(var(--color-primary)/0.05)] rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform duration-700"></div>
      
      {/* Connection Indicator Dot */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] animate-pulse ${
          isConnected 
            ? 'bg-emerald-500 shadow-emerald-500/50' 
            : 'bg-amber-500 shadow-amber-500/50'
        }`} />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-2 mr-6">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </h3>
          {freq && <FrequencyBadge freq={freq} />}
        </div>
        
        <div className="mb-2">
          <span className={`font-bold text-slate-900 dark:text-white tracking-tight ${large ? 'text-4xl md:text-5xl' : 'text-3xl'}`}>
            {value}
          </span>
        </div>
        
        {delta && (
          <div className="mt-auto">
            <span className={`text-xs font-semibold inline-flex items-center px-1.5 py-0.5 rounded ${
              isPositive 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : delta === '--'
                  ? 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
            }`}>
              {delta}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
