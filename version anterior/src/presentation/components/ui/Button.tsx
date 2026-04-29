
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  icon,
  ...props
}) => {
  const variants = {
    primary: 'bg-[hsl(var(--color-primary))] text-white hover:bg-[hsl(var(--color-primary-hover))] shadow-lg shadow-primary/20',
    secondary: 'bg-[hsl(var(--color-secondary))] text-white hover:bg-[hsl(var(--color-secondary-hover))] shadow-lg shadow-secondary/20',
    outline: 'border-2 border-slate-200 bg-transparent hover:bg-slate-100 text-slate-700',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-semibold',
    md: 'px-6 py-2.5 text-sm font-bold',
    lg: 'px-8 py-4 text-base font-extrabold',
  };

  return (
    <button
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};
