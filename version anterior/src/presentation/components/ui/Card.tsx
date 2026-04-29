
import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  animate?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, animate = true, ...props }) => {
  return (
    <div 
      className={cn(
        "bg-white border border-slate-200 rounded-2xl shadow-sm p-6 transition-all",
        animate && "hover:shadow-lg hover:-translate-y-1 duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
