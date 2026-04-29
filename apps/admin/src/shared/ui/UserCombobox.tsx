import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverTrigger, PopoverContent, Spinner } from '@radikal/ui';
import { Search, X, User as UserIcon, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

interface UserLite {
  id: string;
  email: string;
  full_name: string | null;
}

interface Response {
  data: UserLite[];
  meta: { total: number };
}

interface Props {
  value: string | null;
  onChange: (userId: string | null, user: UserLite | null) => void;
  placeholder?: string;
  className?: string;
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function UserCombobox({ value, onChange, placeholder = 'Buscar usuario…', className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = useQuery({
    queryKey: ['admin', 'users', 'detail-lite', value],
    queryFn: () => api.get<{ data: UserLite }>(`/admin/users/${value}`).then((r) => r.data),
    enabled: !!value,
    staleTime: 60_000,
  });

  const results = useQuery({
    queryKey: ['admin', 'users', 'search', debouncedQuery],
    queryFn: () =>
      api
        .get<Response>(
          `/admin/users?pageSize=20${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ''}`,
        )
        .then((r) => r.data),
    enabled: open,
    staleTime: 10_000,
  });

  const displayLabel = useMemo(() => {
    if (!value) return '';
    if (selected.data) return selected.data.full_name ?? selected.data.email;
    return value.slice(0, 8) + '…';
  }, [value, selected.data]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={
            'flex items-center justify-between gap-2 h-11 px-4 rounded-2xl bg-slate-100 text-sm ' +
            'transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white ' +
            (className ?? '')
          }
        >
          <div className="flex items-center gap-2 min-w-0">
            <UserIcon size={14} className="text-slate-400 shrink-0" />
            {value ? (
              <span className="truncate">{displayLabel}</span>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null, null);
                }}
                className="p-1 hover:bg-slate-200 rounded-lg cursor-pointer"
                aria-label="Limpiar"
              >
                <X size={12} />
              </span>
            )}
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        sideOffset={4}
        className="rounded-2xl bg-white shadow-2xl border border-slate-200 w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[calc(100vw-24px)] sm:w-[320px] p-0 z-50"
      >
        <div className="p-2 border-b border-slate-100 relative">
          <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por email o nombre…"
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {results.isLoading ? (
            <div className="py-8 grid place-items-center"><Spinner /></div>
          ) : !results.data || results.data.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Sin resultados.</div>
          ) : (
            results.data.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onChange(u.id, u);
                  setOpen(false);
                  setQuery('');
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex flex-col gap-0.5"
              >
                <span className="text-sm font-medium truncate">{u.full_name ?? u.email}</span>
                {u.full_name && <span className="text-xs text-slate-500 truncate">{u.email}</span>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
