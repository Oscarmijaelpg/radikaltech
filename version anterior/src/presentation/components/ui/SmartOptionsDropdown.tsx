
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

interface SmartOptionsDropdownProps {
  onRefreshHistory: () => void;
  onAddCompetitor: () => void;
  onAddUserSocialAccount: () => void;
  isRefreshing?: boolean;
}

export const SmartOptionsDropdown: React.FC<SmartOptionsDropdownProps> = ({ 
  onRefreshHistory, 
  onAddCompetitor, 
  onAddUserSocialAccount,
  isRefreshing 
}) => {
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
        variant="primary"
        onClick={() => setIsOpen(!isOpen)}
        isLoading={isRefreshing}
        icon={<span className="material-symbols-outlined">settings_suggest</span>}
        className="bg-[hsl(var(--color-primary))] text-white shadow-lg hover:shadow-[hsl(var(--color-primary)/0.3)] transition-all group pr-2"
      >
        Opciones Inteligentes
        <span className={`material-symbols-outlined ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-white rounded-[2rem] shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
          <button
            onClick={() => {
              onRefreshHistory();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 px-6 py-4 text-sm text-slate-700 hover:bg-slate-50 transition-colors group/item"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/item:text-[hsl(var(--color-primary))] group-hover/item:bg-[hsl(var(--color-primary)/0.1)] transition-all shrink-0">
              <span className="material-symbols-outlined">refresh</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 leading-tight">Refrescar Análisis</p>
              <p className="text-[10px] text-slate-500 mt-1">Sincroniza datos históricos</p>
            </div>
          </button>

          <button
            onClick={() => {
              onAddCompetitor();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 px-6 py-4 text-sm text-slate-700 hover:bg-slate-50 transition-colors group/item"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/item:text-[hsl(var(--color-secondary))] group-hover/item:bg-[hsl(var(--color-secondary)/0.1)] transition-all shrink-0">
              <span className="material-symbols-outlined">person_add</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 leading-tight">Agregar Competidor</p>
              <p className="text-[10px] text-slate-500 mt-1">Configura nuevos análisis</p>
            </div>
          </button>

          <div className="mx-6 my-2 border-t border-slate-100"></div>

          <button
            onClick={() => {
              onAddUserSocialAccount();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 px-6 py-4 text-sm text-slate-700 hover:bg-slate-50 transition-colors group/item"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/item:text-emerald-500 group-hover/item:bg-emerald-50 transition-all shrink-0">
              <span className="material-symbols-outlined">add_link</span>
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 leading-tight">Agregar Cuenta RRSS</p>
              <p className="text-[10px] text-slate-500 mt-1">Configura tus redes propias</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
