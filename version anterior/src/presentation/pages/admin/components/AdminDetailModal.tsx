
import React from 'react';
import { Modal } from '../../../components/ui/Modal';

interface AdminDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: {
    label: string;
    value: string | number;
    description?: string;
    history?: { date: string; value: number }[];
  } | null;
}

export const AdminDetailModal: React.FC<AdminDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  data
}) => {
  if (!data) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="lg"
    >
      <div className="p-2 space-y-6">
        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{data.label}</p>
            <p className="text-4xl font-black text-slate-900">{data.value}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-2xl">analytics</span>
          </div>
        </div>

        {data.description && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-slate-400">info</span>
              Descripción
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed bg-white border border-slate-100 p-4 rounded-xl">
              {data.description}
            </p>
          </div>
        )}

        {data.history && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-slate-400">history</span>
              Historial Reciente
            </h4>
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Fecha</th>
                    <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.history.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 font-medium">{item.date}</td>
                      <td className="px-4 py-3 text-slate-900 font-bold">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};
