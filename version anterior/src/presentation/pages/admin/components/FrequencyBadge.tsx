import React from 'react';

type Frequency = 'EN VIVO' | 'DIARIO' | 'SEMANAL' | 'MENSUAL';

interface FrequencyBadgeProps {
  freq: Frequency;
}

export const FrequencyBadge: React.FC<FrequencyBadgeProps> = ({ freq }) => {
  const getStyles = () => {
    switch (freq) {
      case 'EN VIVO':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'DIARIO':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'SEMANAL':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'MENSUAL':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStyles()}`}>
      {freq === 'EN VIVO' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>}
      {freq}
    </div>
  );
};
