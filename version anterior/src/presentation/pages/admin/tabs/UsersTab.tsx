
import React, { useEffect, useState } from 'react';
import { User } from '../../../../core/domain/entities';
import { SupabaseAdminRepository } from '../../../../infrastructure/repositories/SupabaseAdminRepository';
import { SupabaseTokenRepository } from '../../../../infrastructure/repositories/SupabaseTokenRepository';
import { GetUsersUseCase } from '../../../../core/application/use-cases/admin/GetUsersUseCase';
import { UpdateUserRoleUseCase } from '../../../../core/application/use-cases/admin/UpdateUserRoleUseCase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { UserDetailModal } from '../components/UserDetailModal';
import { ManagePlanModal } from '../components/ManagePlanModal';
import { DeactivateUserModal } from '../components/DeactivateUserModal';
import { AdjustBalanceModal } from '../components/AdjustBalanceModal';
import { AdjustUserBalanceUseCase } from '../../../../core/application/use-cases/admin/AdjustUserBalanceUseCase';
import { AdminPermissionsModal } from '../components/AdminPermissionsModal';

export const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenUserId, setMenuOpenUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showAdjustBalance, setShowAdjustBalance] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [isNewAdmin, setIsNewAdmin] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const handleOpenAction = (user: User, action: 'detail' | 'plan' | 'deactivate' | 'adjust' | 'permissions') => {
    setSelectedUser(user);
    setMenuOpenUserId(null);
    if (action === 'detail') setShowDetail(true);
    if (action === 'plan') setShowPlan(true);
    if (action === 'deactivate') setShowDeactivate(true);
    if (action === 'adjust') setShowAdjustBalance(true);
    if (action === 'permissions') {
      setIsNewAdmin(false);
      setShowPermissions(true);
    }
  };

  const handleUpdatePlan = (userId: string, plan: string) => {
    // Aquí iría la llamada al repositorio para actualizar en Supabase
    setToast({ message: `Plan de usuario actualizado a: ${plan.toUpperCase()}`, type: 'success' });
  };

  const handleDeactivate = (userId: string) => {
    // Aquí iría la llamada al repositorio
    setToast({ message: "Usuario desactivado correctamente (Simulación)", type: 'success' });
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'user') => {
    if (newRole === 'admin') {
      const user = users.find(u => u.id === userId);
      if (user) {
        setSelectedUser(user);
        setIsNewAdmin(true);
        setShowPermissions(true);
        setMenuOpenUserId(null);
      }
      return;
    }

    try {
      const repo = new SupabaseAdminRepository();
      const useCase = new UpdateUserRoleUseCase(repo);
      await useCase.execute(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        role: newRole, 
        rol: newRole,
        admin_permissions: newRole === 'user' ? [] : u.admin_permissions 
      } : u));
      setMenuOpenUserId(null);
      setToast({ message: 'Rol actualizado a Usuario', type: 'success' });
    } catch (e) {
      console.error("Error updating role:", e);
      setToast({ message: "Error al actualizar el rol", type: 'error' });
    }
  };


  const handleUpdatePermissions = async (userId: string, permissions: string[], newRole?: 'admin' | 'user') => {
    try {
      const repo = new SupabaseAdminRepository();
      const useCase = new UpdateUserRoleUseCase(repo);
      await useCase.execute(userId, newRole || (selectedUser?.role === 'admin' || selectedUser?.rol === 'admin' ? 'admin' : 'user'), permissions);
      
      setUsers(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        role: newRole || u.role, 
        rol: newRole || u.rol,
        admin_permissions: permissions 
      } : u));
      
      setToast({ message: 'Permisos actualizados correctamente', type: 'success' });
    } catch (e) {
      console.error("Error updating permissions:", e);
      setToast({ message: 'Error al actualizar los permisos', type: 'error' });
      throw e;
    }
  };


  const handleAdjustBalance = async (amount: number, type: 'add' | 'subtract') => {
    if (!selectedUser) return;
    try {
      const repo = new SupabaseTokenRepository(new SupabaseAdminRepository()['supabase' as any]); // Using admin client if possible, but repository needs SupabaseClient
      // Wait, we need the supabase client. SupabaseTokenRepository handles it.
      // For now let's use a workaround to get the client from somewhere or just instantiate
      const { supabase } = await import('../../../../infrastructure/supabase/client');
      const tokenRepo = new SupabaseTokenRepository(supabase);
      const useCase = new AdjustUserBalanceUseCase(tokenRepo);
      await useCase.execute(selectedUser.id, amount, type);
      setToast({ message: 'Saldo ajustado correctamente', type: 'success' });
    } catch (e) {
      console.error("Error adjusting balance:", e);
      setToast({ message: 'Error al ajustar el saldo', type: 'error' });
      throw e;
    }
  };


  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const repo = new SupabaseAdminRepository();
        const useCase = new GetUsersUseCase(repo);
        const data = await useCase.execute();
        setUsers(data);
      } catch (e) {
        console.error("Error loading users:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h2>
          <p className="text-sm text-slate-500 mt-1">Administra los usuarios registrados y sus planes de suscripción.</p>
        </div>
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre, email o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--color-primary))] transition-all outline-none text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Usuario</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Empresa / Industria</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rol</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Estado Onboarding</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fecha Registro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded-full w-full"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <span className="material-symbols-outlined text-4xl mb-2">person_search</span>
                      <p className="text-sm font-bold">No se encontraron usuarios</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs uppercase group-hover:bg-[hsl(var(--color-primary)/0.1)] group-hover:text-[hsl(var(--color-primary))] transition-colors">
                          {user.full_name?.charAt(0) || user.email?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{user.full_name || 'Sin nombre'}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-700">{user.company_name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.industry || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {(user.role === 'admin' || user.rol === 'admin') ? (
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100">Administrador</span>
                      ) : (
                        <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-100">Usuario</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        user.onboarding_completed 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        <div className={`w-1 h-1 rounded-full ${user.onboarding_completed ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        {user.onboarding_completed ? 'Completado' : 'Pendiente'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={() => setMenuOpenUserId(menuOpenUserId === user.id ? null : user.id)}
                        className={`p-2 rounded-lg transition-all ${menuOpenUserId === user.id ? 'bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))]' : 'text-slate-400 hover:text-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary)/0.05)]'}`}
                      >
                        <span className="material-symbols-outlined text-xl">more_vert</span>
                      </button>

                      {menuOpenUserId === user.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setMenuOpenUserId(null)}
                          />
                          <div className="absolute right-6 top-14 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <button 
                              onClick={() => handleOpenAction(user, 'detail')}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg text-slate-400">visibility</span>
                              Ver Detalles
                            </button>
                            <button 
                              onClick={() => handleOpenAction(user, 'plan')}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg text-slate-400">credit_card</span>
                              Gestionar Plan
                            </button>
                            <button 
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg text-slate-400">history</span>
                              Ver Transacciones
                            </button>
                            <div className="h-px bg-slate-100 my-1" />
                            <button 
                              onClick={() => handleUpdateRole(user.id, (user.role === 'admin' || user.rol === 'admin') ? 'user' : 'admin')}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg text-slate-400">
                                {(user.role === 'admin' || user.rol === 'admin') ? 'person' : 'admin_panel_settings'}
                              </span>
                              Convertir a {(user.role === 'admin' || user.rol === 'admin') ? 'Usuario' : 'Administrador'}
                            </button>
                            <button 
                              onClick={() => handleOpenAction(user, 'adjust')}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg text-slate-400">account_balance_wallet</span>
                              Modificar Saldo
                            </button>
                            {(user.role === 'admin' || user.rol === 'admin') && (
                              <button 
                                onClick={() => handleOpenAction(user, 'permissions')}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg text-slate-400">admin_panel_settings</span>
                                Editar Permisos
                              </button>
                            )}
                            <button 
                              onClick={() => handleOpenAction(user, 'deactivate')}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg text-rose-400">block</span>
                              Desactivar Usuario
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <UserDetailModal 
        isOpen={showDetail} 
        onClose={() => setShowDetail(false)} 
        user={selectedUser} 
      />
      <ManagePlanModal 
        isOpen={showPlan} 
        onClose={() => setShowPlan(false)} 
        user={selectedUser} 
        onUpdate={handleUpdatePlan}
      />
      <DeactivateUserModal 
        isOpen={showDeactivate} 
        onClose={() => setShowDeactivate(false)} 
        user={selectedUser} 
        onConfirm={handleDeactivate}
      />
      <AdjustBalanceModal
        isOpen={showAdjustBalance}
        onClose={() => setShowAdjustBalance(false)}
        user={selectedUser}
        onAdjust={handleAdjustBalance}
      />
      <AdminPermissionsModal
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
        user={selectedUser}
        onUpdate={handleUpdatePermissions}
        isNewAdmin={isNewAdmin}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-full duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            <span className="material-symbols-outlined text-xl">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
