
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string; // Content container class
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  fullHeight?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = 'lg',
  fullHeight = false
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Content */}
      <div className={cn(
        "relative bg-white rounded-2xl shadow-xl w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 flex flex-col transition-all",
        maxWidth === 'sm' && "max-w-sm",
        maxWidth === 'md' && "max-w-md",
        maxWidth === 'lg' && "max-w-lg",
        maxWidth === 'xl' && "max-w-xl",
        maxWidth === '2xl' && "max-w-2xl",
        maxWidth === '3xl' && "max-w-3xl",
        maxWidth === '4xl' && "max-w-4xl",
        maxWidth === '5xl' && "max-w-5xl",
        maxWidth === '6xl' && "max-w-6xl",
        maxWidth === '7xl' && "max-w-7xl",
        maxWidth === 'full' && "max-w-[95vw]",
        fullHeight ? "h-[90vh]" : "max-h-[90vh]",
        className
      )}>
        {title && (
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 className="text-lg font-bold text-slate-900 ">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        )}
        <div className={cn(
          "overflow-auto custom-scrollbar flex-1",
          maxWidth === 'full' ? "p-4 md:p-10" : "p-6"
        )}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
