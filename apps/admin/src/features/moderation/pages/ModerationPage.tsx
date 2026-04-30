import React, { useEffect, useState } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
  Badge,
  Input,
} from '@radikal/ui';
import { Trash2, Search, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import {
  useAdminRecommendations,
  useAdminContentAssets,
  useAdminReports,
  useDeleteRecommendation,
  useDeleteContentAsset,
  useDeleteReport,
  type ModerationFilters,
} from '../api/moderation';
import { Pagination } from '@/shared/ui/Pagination';
import { useToast } from '@/shared/ui/Toaster';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

export function ModerationPage() {
  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black">Moderación</h1>
        <p className="text-sm text-slate-500">Contenido generado por usuarios.</p>
      </div>

      <Tabs defaultValue="recommendations">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="recommendations" className="flex-1 sm:flex-none">
            Recomendaciones
          </TabsTrigger>
          <TabsTrigger value="content" className="flex-1 sm:flex-none">
            Contenido
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 sm:flex-none">
            Reportes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          <RecommendationsTab />
        </TabsContent>
        <TabsContent value="content">
          <ContentAssetsTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useDebouncedSearch(
  search: string,
  setFilters: React.Dispatch<React.SetStateAction<ModerationFilters>>,
) {
  useEffect(() => {
    const t = setTimeout(() => {
      const normalized = search.trim() || undefined;
      setFilters((f) => (f.q === normalized ? f : { ...f, q: normalized, page: 1 }));
    }, 200);
    return () => clearTimeout(t);
  }, [search, setFilters]);
}

function RecommendationsTab() {
  const [filters, setFilters] = useState<ModerationFilters>({ page: 1, pageSize: 50 });
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching } = useAdminRecommendations(filters);
  const del = useDeleteRecommendation();
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const loadingBody = isFetching && !isLoading;
  const { toast } = useToast();
  const confirm = useConfirm();

  useDebouncedSearch(search, setFilters);

  const onDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Eliminar recomendación',
      description: `Se eliminará "${title}". No se puede deshacer.`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(id);
      toast({ variant: 'success', title: 'Recomendación eliminada' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al eliminar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4 space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por título o razón…"
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

      <div
        className={clsx('transition-opacity', loadingBody && 'opacity-60 pointer-events-none')}
      >
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Título</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Tipo</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Impacto</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Usuario</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Creada</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Sin resultados.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium">{r.title}</td>
                    <td className="py-3 text-slate-600">{r.kind}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          r.impact === 'high'
                            ? 'destructive'
                            : r.impact === 'medium'
                              ? 'warning'
                              : 'muted'
                        }
                      >
                        {r.impact}
                      </Badge>
                    </td>
                    <td className="py-3 text-xs text-slate-500">{r.user.email}</td>
                    <td className="py-3 text-slate-500">
                      {format(new Date(r.generatedAt), 'dd MMM yyyy')}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(r.id, r.title)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
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
            rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-slate-500 truncate">{r.user.email}</div>
                  </div>
                  <Badge
                    variant={
                      r.impact === 'high'
                        ? 'destructive'
                        : r.impact === 'medium'
                          ? 'warning'
                          : 'muted'
                    }
                  >
                    {r.impact}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {r.kind} · {format(new Date(r.generatedAt), 'dd MMM yyyy')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(r.id, r.title)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
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
  );
}

function ContentAssetsTab() {
  const [filters, setFilters] = useState<ModerationFilters>({ page: 1, pageSize: 50 });
  const { data, isLoading, isFetching } = useAdminContentAssets(filters);
  const del = useDeleteContentAsset();
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const loadingBody = isFetching && !isLoading;
  const { toast } = useToast();
  const confirm = useConfirm();

  const onDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Eliminar contenido',
      description: 'Se eliminará este contenido de forma permanente.',
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(id);
      toast({ variant: 'success', title: 'Contenido eliminado' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al eliminar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4 space-y-4">
      <div
        className={clsx(
          'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 transition-opacity',
          loadingBody && 'opacity-60 pointer-events-none',
        )}
      >
        {isLoading ? (
          <div className="col-span-full py-12 text-center">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">Sin resultados.</div>
        ) : (
          rows.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50"
            >
              {a.assetType === 'image' ? (
                <img src={a.assetUrl} alt="" className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 grid place-items-center text-xs text-slate-500">
                  {a.assetType}
                </div>
              )}
              <div className="p-2 space-y-1">
                <div className="text-xs text-slate-500 truncate">{a.user.email}</div>
                <div className="text-xs text-slate-400">
                  {format(new Date(a.createdAt), 'dd MMM')}
                </div>
                <div className="flex justify-between items-center">
                  <a
                    href={a.assetUrl}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-primary inline-flex items-center gap-1"
                  >
                    Ver <ExternalLink size={10} />
                  </a>
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
  );
}

function ReportsTab() {
  const [filters, setFilters] = useState<ModerationFilters>({ page: 1, pageSize: 50 });
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching } = useAdminReports(filters);
  const del = useDeleteReport();
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const loadingBody = isFetching && !isLoading;
  const { toast } = useToast();
  const confirm = useConfirm();

  useDebouncedSearch(search, setFilters);

  const onDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Eliminar reporte',
      description: `Se eliminará "${title}". No se puede deshacer.`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(id);
      toast({ variant: 'success', title: 'Reporte eliminado' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al eliminar',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4 space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por título…"
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

      <div
        className={clsx('transition-opacity', loadingBody && 'opacity-60 pointer-events-none')}
      >
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Título</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Tipo</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Usuario</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Creado</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Sin resultados.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium">{r.title}</td>
                    <td className="py-3">
                      <Badge variant="muted">{r.reportType}</Badge>
                    </td>
                    <td className="py-3 text-xs text-slate-500">{r.user.email}</td>
                    <td className="py-3 text-slate-500">
                      {format(new Date(r.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(r.id, r.title)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
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
            rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-slate-500 truncate">{r.user.email}</div>
                  </div>
                  <Badge variant="muted">{r.reportType}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{format(new Date(r.createdAt), 'dd MMM yyyy')}</span>
                  <button
                    type="button"
                    onClick={() => onDelete(r.id, r.title)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
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
  );
}
