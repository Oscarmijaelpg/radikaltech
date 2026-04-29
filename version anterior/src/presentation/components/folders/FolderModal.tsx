
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ProjectFolder } from '../../../core/domain/entities';

export const FOLDER_COLORS = [
  { id: 'slate',   label: 'Gris',     bg: 'bg-slate-500',   ring: 'ring-slate-500',   hex: '#64748b' },
  { id: 'red',     label: 'Rojo',     bg: 'bg-red-500',     ring: 'ring-red-500',     hex: '#ef4444' },
  { id: 'orange',  label: 'Naranja',  bg: 'bg-orange-500',  ring: 'ring-orange-500',  hex: '#f97316' },
  { id: 'amber',   label: 'Ámbar',    bg: 'bg-amber-500',   ring: 'ring-amber-500',   hex: '#f59e0b' },
  { id: 'green',   label: 'Verde',    bg: 'bg-green-500',   ring: 'ring-green-500',   hex: '#22c55e' },
  { id: 'teal',    label: 'Teal',     bg: 'bg-teal-500',    ring: 'ring-teal-500',    hex: '#14b8a6' },
  { id: 'blue',    label: 'Azul',     bg: 'bg-blue-500',    ring: 'ring-blue-500',    hex: '#3b82f6' },
  { id: 'indigo',  label: 'Índigo',   bg: 'bg-indigo-500',  ring: 'ring-indigo-500',  hex: '#6366f1' },
  { id: 'violet',  label: 'Violeta',  bg: 'bg-violet-500',  ring: 'ring-violet-500',  hex: '#8b5cf6' },
  { id: 'pink',    label: 'Rosa',     bg: 'bg-pink-500',    ring: 'ring-pink-500',    hex: '#ec4899' },
];

export const FOLDER_ICONS = [
  { id: 'folder',        label: 'Carpeta' },
  { id: 'work',          label: 'Trabajo' },
  { id: 'campaign',      label: 'Marketing' },
  { id: 'code',          label: 'Código' },
  { id: 'palette',       label: 'Diseño' },
  { id: 'analytics',     label: 'Análisis' },
  { id: 'science',       label: 'Ciencia' },
  { id: 'star',          label: 'Favorito' },
  { id: 'bookmark',      label: 'Guardado' },
  { id: 'rocket_launch', label: 'Proyecto' },
  { id: 'groups',        label: 'Equipo' },
  { id: 'lightbulb',     label: 'Ideas' },
];

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color: string; icon: string; description?: string }) => void;
  isLoading?: boolean;
  folder?: ProjectFolder | null;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading,
  folder,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedIcon, setSelectedIcon] = useState('folder');

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || '');
      setSelectedColor(folder.color);
      setSelectedIcon(folder.icon);
    } else {
      setName('');
      setDescription('');
      setSelectedColor('blue');
      setSelectedIcon('folder');
    }
  }, [folder, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      color: selectedColor,
      icon: selectedIcon,
      description: description.trim() || undefined,
    });
  };

  const colorConfig = FOLDER_COLORS.find(c => c.id === selectedColor) || FOLDER_COLORS[6];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={folder ? 'Editar carpeta' : 'Nueva carpeta'}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Preview */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorConfig.bg} shrink-0`}>
            <span className="material-symbols-outlined text-white text-lg">{selectedIcon}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{name || 'Nombre de la carpeta'}</p>
            {description && <p className="text-xs text-slate-500 truncate">{description}</p>}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Nombre *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Campaña de verano"
            maxLength={50}
            required
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Descripción <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Breve descripción del proyecto"
            maxLength={120}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {FOLDER_COLORS.map(color => (
              <button
                key={color.id}
                type="button"
                title={color.label}
                onClick={() => setSelectedColor(color.id)}
                className={`w-7 h-7 rounded-full ${color.bg} transition-all ${
                  selectedColor === color.id
                    ? `ring-2 ring-offset-2 ${color.ring} scale-110`
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Icono
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {FOLDER_ICONS.map(icon => (
              <button
                key={icon.id}
                type="button"
                title={icon.label}
                onClick={() => setSelectedIcon(icon.id)}
                className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                  selectedIcon === icon.id
                    ? `${colorConfig.bg} text-white shadow-sm`
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{icon.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button" disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            type="submit"
            isLoading={isLoading}
            disabled={!name.trim()}
          >
            {folder ? 'Guardar cambios' : 'Crear carpeta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
