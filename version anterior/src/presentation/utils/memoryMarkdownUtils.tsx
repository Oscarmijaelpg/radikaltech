import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { MemoryResource } from '../../core/domain/entities';

// ─── Table Expand Modal ──────────────────────────────────────────────────────
const TableExpandModal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-xl text-slate-500">table_chart</span>
          <span className="font-bold text-slate-800 text-base">Vista completa de tabla</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">close</span>
          Cerrar
        </button>
      </div>
      {/* Table area — fills remaining space, scrollable only if table is truly huge */}
      <div className="flex-1 overflow-auto bg-white" style={{ padding: '1.5rem' }}>
        <table className="w-full border-separate border-spacing-0 text-left" style={{ borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {children}
        </table>
      </div>
    </div>,
    document.body
  );
};

// ─── Table Wrapper (inline + expand button) ──────────────────────────────────
const TableWrapper: React.FC<{ children: React.ReactNode; tableProps: any; className?: string }> = ({ children, tableProps, className }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="relative w-full my-8">
      {/* Expand button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[hsl(var(--color-primary))] text-slate-700 hover:text-[hsl(var(--color-primary))] font-semibold text-sm shadow-sm transition-all active:scale-95 group"
        >
          <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">open_in_full</span>
          Ampliar tabla
        </button>
      </div>

      {/* Inline table (compact, scrollable) */}
      <div className="w-full rounded-2xl shadow-md border border-slate-200 bg-white custom-scrollbar isolate overflow-x-auto overflow-y-auto max-h-[75vh]">
        <table className={clsx('w-full border-separate border-spacing-0 text-left min-w-full relative', className)} {...tableProps}>
          {children}
        </table>
      </div>

      {/* Full-screen modal */}
      {expanded && (
        <TableExpandModal onClose={() => setExpanded(false)}>
          {children}
        </TableExpandModal>
      )}
    </div>
  );
};

export const processCitations = (content: string, idPrefix: string) => {
  if (!content) return '';

  const sourceMap: Record<string, string> = {};
  const lines = content.split('\n');

  // Mapeo más robusto de URLs
  lines.forEach(line => {
    // Caso 1: Estilo de lista de fuentes "1. https://..." o "[1] https://..." o "- [1] https://..."
    const sourceMatch = line.match(/(?:^|\s|\[)(\d+)(?:\s*[\.\:\]\-\)]+)\s*(https?:\/\/[^\s\)\]'"]+)/);
    if (sourceMatch) {
       sourceMap[sourceMatch[1]] = sourceMatch[2];
    } else {
       // Caso 2: URL en cualquier parte de la línea con un número
       const numMatch = line.match(/\[(\d+)\]/);
       const urlMatch = line.match(/(https?:\/\/[^\s\)\]'"]+)/);
       if (numMatch && urlMatch) {
         sourceMap[numMatch[1]] = urlMatch[1];
       }
    }
  });

  // Mapeo de referencias estilo markdown [1]: url
  const refRegex = /\[(\d+)\]:\s*(https?:\/\/[^\s\)\]'"]+)/g;
  let match;
  while ((match = refRegex.exec(content)) !== null) {
    sourceMap[match[1]] = match[2];
  }

  let text = content;
  // Reemplazar [1], [1, 2], [1,2, 3] por links
  text = text.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (ogMatch, numsStr) => {
    const nums = numsStr.split(',').map((n: string) => n.trim());
    const links = nums.map((n: string) => {
      const url = sourceMap[n];
      if (url) {
        return `[${n}](${url})`;
      }
      return `[${n}](#source-${idPrefix}-${n})`;
    });
    // Si son varios, los unimos sin espacios extras pero que se vean bien
    return links.join(' ');
  });

  return text;
};

export const renderFormattedBrandText = (text: string | any, customClassName?: string, truncateTitles?: boolean) => {
  if (!text) return null;

  // Use the brand description if it's the new structured object
  let safeText = '';
  if (typeof text === 'string') {
    safeText = text;
  } else if (typeof text === 'object') {
    safeText = text.analisis || JSON.stringify(text);
  }

  const segments = safeText.split(/\.\s+/);

  return segments.map((segment, idx) => {
    if (!segment.trim()) return null;

    const colonIndex = segment.indexOf(':');
    if (colonIndex !== -1) {
      const title = segment.substring(0, colonIndex).trim();
      const content = segment.substring(colonIndex + 1).trim();
      
      let displayTitle = title;
      if (truncateTitles && title.length > 40) {
        displayTitle = title.substring(0, 40) + '...';
      }

      return (
        <div key={idx} className="mb-6 last:mb-0">
          <div className="text-[hsl(327,100%,51%)] font-black tracking-widest text-[11px] mb-2 leading-tight">
            {displayTitle}
          </div>
          <div className={clsx("leading-relaxed text-sm", customClassName || "text-slate-600")}>
            {content}{idx < segments.length - 1 ? '.' : ''}
          </div>
        </div>
      );
    }
    return (
      <div key={idx} className={clsx("mb-4 last:mb-0 leading-relaxed text-sm", customClassName || "text-slate-600")}>
        {segment}{idx < segments.length - 1 ? '.' : ''}
      </div>
    );
  });
};

export const getMemoryIcon = (m: any) => {
  if (m.subTitle === 'Ubicaciones') return 'location_on';
  if (m.subTitle === 'Canales de Contacto') return 'contact_support';
  if (m.subTitle === 'Oportunidades') return 'lightbulb';
  if (String(m.memory_category || '').toLowerCase().includes('estrategia')) return 'trending_up';
  if (String(m.memory_category || '').toLowerCase().includes('personal')) return 'person';
  if (String(m.memory_category || '').toLowerCase().includes('trabajo')) return 'work';
  if (m.resource_type === 'link') return 'link';
  if (m.resource_type === 'document') return 'description';
  if (/instagram/i.test(m.memory_category || '')) return 'photo_camera';
  return 'sticky_note_2';
};

export const getMarkdownComponents = (resourceId: string): any => ({
  h1: ({ className, node, ...props }: any) => <h1 className={clsx("text-2xl md:text-4xl font-black mb-6 md:mb-8 text-slate-900", className)} {...props} />,
  h2: ({ className, node, ...props }: any) => <h2 className={clsx("text-xl md:text-2xl font-bold mt-8 md:mt-12 mb-4 md:mb-6 text-slate-800 flex items-center gap-3", className)} {...props} />,
  h3: ({ className, node, ...props }: any) => <h3 className={clsx("text-xl font-bold mt-8 mb-4 text-slate-800", className)} {...props} />,
  p: ({ className, node, ...props }: any) => <p className={clsx("mb-6 text-lg text-slate-600 leading-relaxed", className)} {...props} />,
  table: ({ className, node, children, ...props }: any) => (
    <TableWrapper tableProps={props} className={className}>
      {children}
    </TableWrapper>
  ),
  thead: ({ className, node, ...props }: any) => <thead className={clsx("", className)} {...props} />,
  th: ({ className, node, ...props }: any) => (
    <th
      className={clsx(
        "px-6 py-4 font-bold text-slate-700 border-b border-slate-200 sticky bg-slate-50 z-[30] first:rounded-tl-2xl last:rounded-tr-2xl shadow-sm text-left",
        className
      )}
      style={{ top: 0, position: 'sticky', backgroundClip: 'padding-box' }}
      {...props}
    />
  ),
  td: ({ className, node, ...props }: any) => <td className={clsx("px-6 py-4 border-b border-slate-100 text-slate-600 break-words", className)} style={{ minWidth: '150px' }} {...props} />,
  ul: ({ className, node, ...props }: any) => <ul className={clsx("list-disc pl-8 mb-6 space-y-3 text-slate-600", className)} {...props} />,
  ol: ({ className, node, ...props }: any) => <ol className={clsx("list-decimal pl-8 mb-6 space-y-3 text-slate-600", className)} {...props} />,
  li: ({ className, node, children, ...props }: any) => {
    let anchorId: string | undefined = undefined;
    const childArray = React.Children.toArray(children);
    const firstChild = childArray[0];

    // Detectar si el li es un Titular
    const getDeepText = (c: any): string => {
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) return c.map(getDeepText).join('');
      if (React.isValidElement(c)) return getDeepText((c.props as any).children);
      return '';
    };
    const textContent = getDeepText(children).trim();
    const isTitle = /^(?:\d+[\s\-.:]\s*)?Titular:/i.test(textContent);

    if (typeof firstChild === 'string') {
      const m = firstChild.match(/^(\d+)[\s\-.:]+/);
      if (m) anchorId = `source-${resourceId}-${m[1]}`;
    }

    return (
      <li
        id={anchorId}
        className={clsx(
          "relative",
          isTitle ? "is-headline" : "",
          className
        )}
        {...props}
      >
        {children}
      </li>
    );
  },
  blockquote: ({ className, node, ...props }: any) => (
    <blockquote className={clsx("border-l-4 border-[hsl(var(--color-primary))] pl-6 py-2 italic my-8 text-slate-500 bg-slate-50 rounded-r-lg", className)} {...props} />
  ),
  code: ({ className, node, ...props }: any) => <code className={clsx("bg-slate-100 px-2 py-1 rounded text-sm font-mono text-[hsl(var(--color-primary))]", className)} {...props} />,
  a: ({ href, children, className, node, ...props }: any) => {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(
          "text-[hsl(var(--color-primary))] hover:underline cursor-pointer text-sm font-semibold",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
});
