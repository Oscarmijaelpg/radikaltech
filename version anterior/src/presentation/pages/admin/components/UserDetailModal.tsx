
import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { User } from '../../../../core/domain/entities';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Usuario" maxWidth="md">
      <div className="space-y-6 p-2">
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center text-[hsl(var(--color-primary))] font-black text-xl">
            {user.full_name?.charAt(0) || user.email?.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user.full_name || 'Sin nombre'}</h3>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 p-4 bg-white border border-slate-100 rounded-xl">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Empresa</p>
            <p className="text-sm font-bold text-slate-700">{user.company_name || 'No especificada'}</p>
          </div>
          <div className="space-y-1 p-4 bg-white border border-slate-100 rounded-xl">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Industria</p>
            <p className="text-sm font-bold text-slate-700">{user.industry || 'No especificada'}</p>
          </div>
          <div className="space-y-1 p-4 bg-white border border-slate-100 rounded-xl">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado Onboarding</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${user.onboarding_completed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <p className="text-sm font-bold text-slate-700">{user.onboarding_completed ? 'Completado' : 'Pendiente'}</p>
            </div>
          </div>
          <div className="space-y-1 p-4 bg-white border border-slate-100 rounded-xl">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha de Registro</p>
            <p className="text-sm font-bold text-slate-700">
              {user.created_at ? format(new Date(user.created_at), 'PPP', { locale: es }) : 'N/A'}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
