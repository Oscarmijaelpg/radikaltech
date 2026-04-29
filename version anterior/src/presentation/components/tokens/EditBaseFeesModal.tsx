import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Service } from '../../../core/domain/entities/Token';
import { useUpdateService } from '../../hooks/useTokens';
import { Button } from '../ui/Button';

interface EditBaseFeesModalProps {
  services: Service[];
  onClose: () => void;
}

export const EditBaseFeesModal: React.FC<EditBaseFeesModalProps> = ({ services, onClose }) => {
  const { mutateAsync: updateService, isPending } = useUpdateService();
  const [formValues, setFormValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize form with current values
  useEffect(() => {
    const initialValues: Record<string, number> = {};
    services.forEach(s => {
      initialValues[s.id] = s.token_cost;
    });
    setFormValues(initialValues);
  }, [services]);

  const handleChange = (serviceId: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [serviceId]: Number(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      // Update each changed service sequentially or all via Promise.all
      const updates = services
        .filter(s => formValues[s.id] !== s.token_cost)
        .map(s => updateService({ serviceId: s.id, updates: { token_cost: formValues[s.id] } }));
      
      await Promise.all(updates);
      onClose();
    } catch (err: any) {
       setError(err.message || 'Error al actualizar las tarifas.');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">edit</span>
            Editar Tarifas Base
        </h2>
        <p className="text-sm text-gray-500 mb-6">Ajusta el costo en tokens de cada servicio base.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
                {services.map(service => (
                    <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="text-sm font-medium text-gray-700">{service.name}</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                min="0"
                                value={formValues[service.id] ?? ''}
                                onChange={(e) => handleChange(service.id, e.target.value)}
                                className="w-24 border border-gray-300 rounded-lg text-right p-2 font-bold focus:ring-primary focus:border-primary"
                            />
                            <span className="text-sm text-gray-500 font-bold">TR</span>
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-100 p-3 rounded">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                    Cancelar
                </Button>
                <Button type="submit" isLoading={isPending}>
                    Guardar Cambios
                </Button>
            </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
