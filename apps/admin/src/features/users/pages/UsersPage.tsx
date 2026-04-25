import { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Badge,
  Spinner,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@radikal/ui';
import { Search, Trash2, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useAdminUsers, useDeleteUser, type UsersListFilters, type AdminUser } from '../api/users';
import { UserDetailDrawer } from '../components/UserDetailDrawer';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Pagination } from '@/shared/ui/Pagination';
import { api } from '@/lib/api';
import { qs } from '@/shared/lib/qs';
import { toCsv, downloadCsv } from '@/shared/lib/csv';
import { useToast } from '@/shared/ui/Toaster';

export function UsersPage() {
  const [filters, setFilters] = useState<UsersListFilters>({
    page: 1,
    pageSize: 50,
    sort: '-createdAt',
  });
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickDelete, setQuickDelete] = useState<AdminUser | null>(null);
  const [exporting, setExporting] = useState(false);
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  const { data, isLoading, isFetching } = useAdminUsers(filters);

  useEffect(() => {
    const t = setTimeout(() => {
      const normalized = search.trim() || undefined;
      setFilters((f) => (f.q === normalized ? f : { ...f, q: normalized, page: 1 }));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const onExportCsv = async () => {
    setExporting(true);
    try {
      const all: AdminUser[] = [];
      let page = 1;
      const pageSize = 200;
      while (page <= 20) {
        const res = await api.get<{
          data: AdminUser[];
          meta: { totalPages: number };
        }>(`/admin/users${qs({ ...filters, page, pageSize })}`);
        all.push(...res.data);
        if (page >= res.meta.totalPages) break;
        page += 1;
      }
      const csv = toCsv(all, [
        { key: 'email', label: 'Correo' },
        { key: 'full_name', label: 'Nombre' },
        { key: 'role', label: 'Rol' },
        { key: 'onboarding_completed', label: 'Onboarding completo' },
        { key: 'onboarding_step', label: 'Paso onboarding' },
        { key: 'language', label: 'Idioma' },
        { key: 'created_at', label: 'Alta' },
        { key: 'id', label: 'ID' },
      ]);
      downloadCsv(`usuarios-${Date.now()}.csv`, csv);
      toast({ variant: 'success', title: `Exportados ${all.length} usuarios` });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error al exportar',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const onFilterChange = (patch: Partial<UsersListFilters>) => {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  };

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const loadingBody = isFetching && !isLoading;

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">Usuarios</h1>
          <p className="text-sm text-slate-500">
            {meta ? `${meta.total} cuentas en total` : 'Cargando…'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onExportCsv} disabled={exporting}>
          <Download size={14} />
          <span className="hidden sm:inline">{exporting ? 'Exportando…' : 'Exportar CSV'}</span>
          <span className="sm:hidden">CSV</span>
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-3 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
          <div className="relative sm:flex-1 sm:min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por correo o nombre…"
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

          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.role ?? 'all'}
              onValueChange={(v) =>
                onFilterChange({ role: v === 'all' ? undefined : (v as 'user' | 'admin') })
              }
            >
              <SelectTrigger className="w-full flex-1 sm:flex-none sm:w-[140px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.onboarded ?? 'all'}
              onValueChange={(v) =>
                onFilterChange({ onboarded: v === 'all' ? undefined : (v as 'true' | 'false') })
              }
            >
              <SelectTrigger className="w-full flex-1 sm:flex-none sm:w-[160px]">
                <SelectValue placeholder="Onboarding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Onboarded</SelectItem>
                <SelectItem value="false">Pendiente</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sort ?? '-createdAt'}
              onValueChange={(v) => onFilterChange({ sort: v as UsersListFilters['sort'] })}
            >
              <SelectTrigger className="w-full flex-1 sm:flex-none sm:w-[180px]">
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-createdAt">Más recientes</SelectItem>
                <SelectItem value="createdAt">Más antiguos</SelectItem>
                <SelectItem value="email">Correo A-Z</SelectItem>
                <SelectItem value="-email">Correo Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Usuario</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Rol</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Onboarding</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Alta</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500 text-right">
                    Acciones
                  </th>
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
                  rows.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedId(u.id)}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            avatarUrl={u.avatar_url}
                            label={u.full_name ?? u.email}
                            size={36}
                          />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{u.full_name ?? u.email}</div>
                            {u.full_name && (
                              <div className="text-xs text-slate-500 truncate">{u.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant={u.role === 'admin' ? 'primary' : 'outline'}>{u.role}</Badge>
                      </td>
                      <td className="py-3">
                        {u.onboarding_completed ? (
                          <Badge variant="outline" className="text-emerald-600">
                            Completo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">
                            {u.onboarding_step}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-slate-500">
                        {format(new Date(u.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickDelete(u);
                          }}
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
              rows.map((u) => (
                <div
                  key={u.id}
                  className="rounded-2xl border border-slate-200 p-3 active:bg-slate-50 cursor-pointer flex items-center gap-3"
                  onClick={() => setSelectedId(u.id)}
                >
                  <UserAvatar
                    avatarUrl={u.avatar_url}
                    label={u.full_name ?? u.email}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium truncate">{u.full_name ?? u.email}</div>
                      <Badge variant={u.role === 'admin' ? 'primary' : 'outline'}>{u.role}</Badge>
                    </div>
                    {u.full_name && (
                      <div className="text-xs text-slate-500 truncate">{u.email}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{format(new Date(u.created_at), 'dd MMM yyyy')}</span>
                      <span>·</span>
                      {u.onboarding_completed ? (
                        <span className="text-emerald-600">Onboarding completo</span>
                      ) : (
                        <span className="text-amber-600">Onboarding: {u.onboarding_step}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickDelete(u);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
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

      <UserDetailDrawer userId={selectedId} onClose={() => setSelectedId(null)} />

      <ConfirmDeleteDialog
        open={!!quickDelete}
        onOpenChange={(o) => !o && setQuickDelete(null)}
        title="Eliminar usuario"
        description={`Esta acción elimina la cuenta ${quickDelete?.email ?? ''} y TODOS sus datos. No se puede deshacer.`}
        confirmText={quickDelete?.email ?? ''}
        loading={deleteUser.isPending}
        requirePassword
        onConfirm={async (password) => {
          if (!quickDelete || !password) return;
          await deleteUser.mutateAsync({ id: quickDelete.id, password });
          setQuickDelete(null);
        }}
      />
    </div>
  );
}
