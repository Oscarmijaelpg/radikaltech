import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface DeleteChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chatTitle?: string;
  isLoading?: boolean;
}

export const DeleteChatModal: React.FC<DeleteChatModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  chatTitle,
  isLoading
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eliminar Chat"
      maxWidth="md"
    >
      <div className="p-2 space-y-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
            <span className="material-symbols-outlined text-3xl">delete</span>
          </div>
          <h3 className="text-xl font-bold text-slate-800">¿Eliminar esta conversación?</h3>
          <p className="text-slate-600 text-sm">
            Esta acción es permanente y no se puede deshacer. Se eliminará: <br />
            <span className="font-semibold text-slate-900 mt-2 block">"{chatTitle || 'este chat'}"</span>
          </p>
        </div>

        <div className="flex gap-4 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            Sí, eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
