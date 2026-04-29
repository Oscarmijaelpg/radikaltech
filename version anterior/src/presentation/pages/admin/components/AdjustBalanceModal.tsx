import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { User } from '../../../../core/domain/entities';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onAdjust: (amount: number, type: 'add' | 'subtract') => Promise<void>;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({ isOpen, onClose, user, onAdjust }) => {
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'add' | 'subtract'>('add');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setLoading(true);
    try {
      await onAdjust(numAmount, type);
      setAmount('');
      onClose();
    } catch (error) {
      console.error('Error adjusting balance:', error);
      alert('Error al ajustar el saldo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajustar Saldo de Tokens" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-6 p-2">
        <div className="text-sm text-slate-500">
          Modifica el saldo de <span className="font-bold text-slate-900">{user.full_name || user.email}</span>.
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setType('add')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              type === 'add' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sumar (+)
          </button>
          <button
            type="button"
            onClick={() => setType('subtract')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              type === 'subtract' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Restar (-)
          </button>
        </div>

        <Input
          type="number"
          label="Cantidad de Tokens (TR)"
          placeholder="Ej: 500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="1"
        />

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            isLoading={loading}
            className={type === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 border-none' : 'bg-rose-600 hover:bg-rose-700 border-none'}
          >
            {type === 'add' ? 'Añadir Tokens' : 'Quitar Tokens'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
