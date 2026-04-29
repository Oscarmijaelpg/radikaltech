import React from 'react';

export const SkeletonLoader: React.FC<{ className?: string }> = ({ className = "h-32 w-full" }) => {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`}></div>
  );
};
