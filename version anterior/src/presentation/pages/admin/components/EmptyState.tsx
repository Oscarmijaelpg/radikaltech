import React from 'react';

export const EmptyState: React.FC<{ message?: string }> = ({ message = "Sin datos aún" }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 min-h-[160px]">
      <span className="material-symbols-outlined text-4xl mb-3 opacity-50">analytics</span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};
