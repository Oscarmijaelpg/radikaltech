
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, icon, error, className, ...props }) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-sm font-semibold text-slate-700 ml-1" htmlFor={props.id}>{label}</label>}
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[hsl(var(--color-primary))] transition-colors">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
        )}
        <input
          className={cn(
            "block w-full bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:border-transparent transition-all outline-none placeholder-slate-400",
            icon ? "pl-11 pr-4 py-3" : "px-4 py-3",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
};
