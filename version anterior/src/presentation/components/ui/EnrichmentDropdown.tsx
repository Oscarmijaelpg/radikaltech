import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

interface EnrichmentDropdownProps {
  onEnrich: (type: 'infographic' | 'chart') => void;
  isLoading?: boolean;
}

export const EnrichmentDropdown: React.FC<EnrichmentDropdownProps> = ({ onEnrich, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        isLoading={isLoading}
        icon={<span className="material-symbols-outlined text-sm">auto_awesome</span>}
        className="bg-white/50 backdrop-blur-sm border-slate-200 hover:border-[hsl(var(--color-primary))] text-slate-700 hover:text-[hsl(var(--color-primary))] transition-all"
      >
        Enriquecer
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
          <button
            onClick={() => {
              onEnrich('infographic');
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg text-[hsl(var(--color-primary))]">image</span>
            <div className="text-left">
              <p className="font-bold leading-none">Crear infografía</p>
              <p className="text-[10px] text-slate-500 mt-1">Generar imagen visual de este tema</p>
            </div>
          </button>
          

          <button
            onClick={() => {
              onEnrich('chart');
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg text-emerald-500">bar_chart</span>
            <div className="text-left">
              <p className="font-bold leading-none">Crear gráfico</p>
              <p className="text-[10px] text-slate-500 mt-1">Visualizar datos conceptuales</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
