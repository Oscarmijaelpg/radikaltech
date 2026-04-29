
import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { User } from '../../../../core/domain/entities';

interface ManagePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (userId: string, plan: string) => void;
}

export const ManagePlanModal: React.FC<ManagePlanModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  const [selectedPlan, setSelectedPlan] = useState('free');

  if (!user) return null;

  const plans = [
    { id: 'free', name: 'Plan Gratuito', desc: 'Funcionalidades básicas limitadas', icon: 'person' },
    { id: 'pro', name: 'Plan Profesional', desc: 'Acceso completo a agentes y prioridad', icon: 'star' },
    { id: 'enterprise', name: 'Plan Corporativo', desc: 'Solución a medida para equipos grandes', icon: 'business' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Plan de Suscripción" maxWidth="md">
      <div className="space-y-6 p-2">
        <div className="text-sm text-slate-500">
          Selecciona el nuevo nivel de acceso para <span className="font-bold text-slate-900">{user.full_name || user.email}</span>.
        </div>

        <div className="space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                selectedPlan === plan.id 
                  ? 'border-[hsl(var(--color-primary))] bg-primary/5' 
                  : 'border-slate-100 hover:border-slate-200 bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedPlan === plan.id ? 'bg-[hsl(var(--color-primary))] text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <span className="material-symbols-outlined">{plan.icon}</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-sm">{plan.name}</div>
                <div className="text-xs text-slate-500">{plan.desc}</div>
              </div>
              {selectedPlan === plan.id && (
                <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">check_circle</span>
              )}
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onUpdate(user.id, selectedPlan);
              onClose();
            }}
            className="px-6 py-2.5 bg-[hsl(var(--color-primary))] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Actualizar Plan
          </button>
        </div>
      </div>
    </Modal>
  );
};
