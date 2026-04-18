import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@radikal/ui';

interface FeatureHintProps {
  id: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom';
  children: ReactNode;
}

function hintKey(id: string) {
  return `radikal-hint-${id}`;
}

/**
 * First-visit popover hint. Shows a popover next to the child the first time it
 * is rendered in this browser. Dismissed on "Entendido" and never shown again.
 */
export function FeatureHint({ id, title, description, placement = 'bottom', children }: FeatureHintProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(hintKey(id)) !== '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!open) return;
    // Small delay so the target is laid out before we show the hint.
    const t = window.setTimeout(() => {
      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(hintKey(id), '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative inline-block w-full">
      {children}
      {open && (
        <div
          className={[
            'absolute left-0 right-0 z-40 flex justify-start',
            placement === 'top' ? 'bottom-full mb-3' : 'top-full mt-3',
          ].join(' ')}
          role="dialog"
          aria-label={title}
        >
          <div className="relative max-w-sm rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div
              className={[
                'absolute w-3 h-3 rotate-45 bg-slate-900 border-slate-800',
                placement === 'top'
                  ? 'bottom-[-6px] left-8 border-r border-b'
                  : 'top-[-6px] left-8 border-l border-t',
              ].join(' ')}
            />
            <div className="flex items-start gap-2 mb-2">
              <Icon name="tips_and_updates" className="text-[20px] text-pink-400" />
              <p className="font-bold text-sm">{title}</p>
            </div>
            <p className="text-xs text-slate-300 mb-3">{description}</p>
            <button
              type="button"
              onClick={dismiss}
              className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
