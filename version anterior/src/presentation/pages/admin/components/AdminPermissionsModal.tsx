
import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { User } from '../../../../core/domain/entities';
import { Button } from '../../../components/ui/Button';

interface AdminPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (userId: string, permissions: string[], newRole?: 'admin' | 'user') => Promise<void>;
  isNewAdmin?: boolean;
}

const ALL_SECTIONS = [
  { id: 'executive', label: 'Ejecutivo', icon: 'monitoring' },
  { id: 'users', label: 'Usuarios', icon: 'group' },
  { id: 'commercial', label: 'Comercial', icon: 'trending_up' },
  { id: 'finance', label: 'Finanzas', icon: 'payments' },
  { id: 'marketing', label: 'Marketing', icon: 'campaign' },
  { id: 'product', label: 'Producto', icon: 'inventory_2' },
  { id: 'tokens', label: 'Tokens y Planes', icon: 'local_activity' }
];

export const AdminPermissionsModal: React.FC<AdminPermissionsModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onUpdate,
  isNewAdmin = false
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.admin_permissions && !isNewAdmin) {
      setSelectedPermissions(user.admin_permissions);
    } else if (isNewAdmin) {
      // Default to all sections for new admin if preferred, or none
      setSelectedPermissions(['executive', 'users', 'commercial', 'finance', 'marketing', 'product', 'tokens']);
    } else {
      setSelectedPermissions([]);
    }
  }, [user, isOpen, isNewAdmin]);

  if (!user) return null;

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdate(user.id, selectedPermissions, isNewAdmin ? 'admin' : undefined);
      onClose();
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Error al actualizar los permisos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isNewAdmin ? "Convertir a Administrador" : "Gestionar Permisos"} maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-6 p-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Permisos de Acceso</h3>
          <p className="text-xs text-slate-500">
            {isNewAdmin 
              ? `Configura las secciones a las que ${user.full_name || user.email} tendrá acceso como administrador.`
              : `Modifica las secciones visibles para ${user.full_name || user.email}.`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_SECTIONS.map((section) => {
            const isSelected = selectedPermissions.includes(section.id);
            return (
              <div 
                key={section.id}
                onClick={() => togglePermission(section.id)}
                className={`group flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.02)] shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[hsl(var(--color-primary))] text-white scale-105 shadow-lg shadow-primary/20'
                      : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                  }`}>
                    <span className="material-symbols-outlined text-xl">{section.icon}</span>
                  </div>
                  <div className="truncate">
                    <div className={`text-sm font-black tracking-tight truncate ${isSelected ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                      {section.label}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">Sección</div>
                  </div>
                </div>

                <div className={`w-10 h-6 shrink-0 flex items-center px-1 rounded-full relative transition-all duration-500 ease-in-out ${
                  isSelected ? 'bg-[hsl(var(--color-primary))]' : 'bg-slate-200'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm transform ${
                    isSelected ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading} className="px-6">
            Cancelar
          </Button>
          <Button 
            type="submit" 
            isLoading={loading}
            className="bg-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-primary-dark))] border-none shadow-xl shadow-primary/20 px-8"
          >
            {isNewAdmin ? 'Convertir a Admin' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
