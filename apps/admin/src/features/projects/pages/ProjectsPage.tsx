import { useEffect, useState } from 'react';
import { Input, Spinner } from '@radikal/ui';
import { Search } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useAdminProjects, type ProjectsFilters } from '../api/projects';
import { ProjectDetailDrawer } from '../components/ProjectDetailDrawer';
import { Pagination } from '@/shared/ui/Pagination';
import { UserCombobox } from '@/shared/ui/UserCombobox';
import { ProjectBadge } from '@/shared/ui/ProjectBadge';

export function ProjectsPage() {
  const [filters, setFilters] = useState<ProjectsFilters>({ page: 1, pageSize: 50 });
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useAdminProjects(filters);

  useEffect(() => {
    const t = setTimeout(() => {
      const normalized = search.trim() || undefined;
      setFilters((f) => (f.q === normalized ? f : { ...f, q: normalized, page: 1 }));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const loadingBody = isFetching && !isLoading;

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black">Proyectos</h1>
        <p className="text-sm text-slate-500">
          {meta ? `${meta.total} proyectos en total` : 'Cargando…'}
        </p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
          <div className="relative sm:flex-1 sm:min-w-[260px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, empresa o sitio web…"
              aria-label="Buscar proyectos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {isFetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </div>
            )}
          </div>
          <UserCombobox
            value={filters.userId ?? null}
            onChange={(userId) =>
              setFilters((f) => ({ ...f, userId: userId ?? undefined, page: 1 }))
            }
            placeholder="Todos los propietarios"
            className="w-full sm:min-w-[220px]"
          />
        </div>

        <div
          className={clsx(
            'transition-opacity',
            loadingBody && 'opacity-60 pointer-events-none',
          )}
        >
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Proyecto</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Industria</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Propietario</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Alta</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <Spinner />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedId(p.id)}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <ProjectBadge
                            logoUrl={p.logoUrl}
                            label={p.companyName ?? p.name}
                            size={36}
                          />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            {p.companyName && p.companyName !== p.name && (
                              <div className="text-xs text-slate-500 truncate">{p.companyName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">{p.industry ?? '—'}</td>
                      <td className="py-3 text-slate-500 text-xs">{p.user.email}</td>
                      <td className="py-3 text-slate-500">
                        {format(new Date(p.createdAt), 'dd MMM yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {isLoading ? (
              <div className="py-12 grid place-items-center">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Sin resultados.</div>
            ) : (
              rows.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 p-3 active:bg-slate-50 cursor-pointer flex items-center gap-3"
                  onClick={() => setSelectedId(p.id)}
                >
                  <ProjectBadge
                    logoUrl={p.logoUrl}
                    label={p.companyName ?? p.name}
                    size={44}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {p.industry ? `${p.industry} · ` : ''}
                      {p.user.email}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {format(new Date(p.createdAt), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {meta && (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            isFetching={isFetching}
            onChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </div>

      <ProjectDetailDrawer projectId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
