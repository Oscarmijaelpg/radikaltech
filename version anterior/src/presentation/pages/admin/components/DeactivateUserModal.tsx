
import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { User } from '../../../../core/domain/entities';

interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: (userId: string) => void;
}

export const DeactivateUserModal: React.FC<DeactivateUserModalProps> = ({ isOpen, onClose, user, onConfirm }) => {
  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Desactivación" maxWidth="sm">
      <div className="space-y-6 p-2 text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
          <span className="material-symbols-outlined text-4xl">warning</span>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-slate-900">¿Estás seguro?</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Estás a punto de desactivar la cuenta de <span className="font-bold text-slate-900">{user.full_name || user.email}</span>. 
            El usuario ya no podrá acceder a la plataforma.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={() => {
              onConfirm(user.id);
              onClose();
            }}
            className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
          >
            Sí, Desactivar Usuario
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
          >
            No, Mantener Activo
          </button>
        </div>
      </div>
    </Modal>
  );
};
