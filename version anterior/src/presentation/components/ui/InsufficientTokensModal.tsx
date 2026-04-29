import React from 'react';
import { Modal } from './Modal';
import { useNavigate } from 'react-router-dom';

interface InsufficientTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const InsufficientTokensModal: React.FC<InsufficientTokensModalProps> = ({ isOpen, onClose, message }) => {
  const navigate = useNavigate();

  const handleRecharge = () => {
    onClose();
    navigate('/tokens'); 
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" className="bg-white">
      <div className="flex flex-col items-center text-center py-6 px-4">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-rose-500 text-4xl">account_balance_wallet</span>
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Saldo Insuficiente</h3>
        
        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
          {message || 'No tienes suficientes Radikal Tokens para realizar esta acción. Por favor, recarga tu billetera para continuar creando contenido de impacto.'}
        </p>

        <div className="flex flex-col w-full gap-3">
          <button
            onClick={handleRecharge}
            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-slate-900/20"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            Recargar Tokens
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
};
