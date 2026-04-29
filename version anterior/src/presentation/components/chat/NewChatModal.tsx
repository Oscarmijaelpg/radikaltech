
import React, { useState } from 'react';
import { useObjectives } from '../../hooks/useObjectives';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../context/AuthContext';
import { useProjectContext } from '../../context/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAgents } from '../../hooks/useAgents';
import { Agent } from '../../../core/domain/entities';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { data: objectives, isLoading } = useObjectives();
  const { createChat } = useChat();
  const { user } = useAuth();
  const { activeProject } = useProjectContext();
  const navigate = useNavigate();
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: agents = [] } = useAgents(selectedObjective || undefined);
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);

  const handleCreateChat = async () => {
    if (!user) {
        console.error('No user found');
        return;
    }
    if (!selectedObjective) {
        alert('Por favor, selecciona un objetivo para comenzar el chat.');
        return;
    }
    if (!activeProject) {
        alert('No tienes un proyecto seleccionado. Asegúrate de tener al menos un proyecto en tu espacio de trabajo.');
        return;
    }

    setCreating(true);
    try {
      const objectiveName = objectives?.find(obj => obj.id === selectedObjective)?.name;
      const chat = await createChat({
        userId: user.id,
        projectId: activeProject.id,
        objectiveId: selectedObjective,
        title: objectiveName || 'Nueva Conversación'
      });
      onClose();
      navigate(`/chat/${chat.id}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Hubo un error al crear el chat. Por favor, intenta de nuevo.');
    } finally {
      setCreating(false);
      setSelectedObjective(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Tarea"
    >
      <div className="space-y-6 w-full max-w-3xl">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">¿En qué te puedo ayudar hoy?</h2>
          <p className="text-slate-500 ">Selecciona un objetivo para comenzar.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse"></div>
            ))
          ) : (
            objectives
              ?.filter(obj => 
                !obj.name.includes('Dirección creativa imagen Libertario') && 
                !obj.name.includes('Customer Success') && 
                !obj.name.includes('Automatización')
              )
              .map(obj => (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObjective(obj.id)}
                  className={`
                   cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden group
                   ${selectedObjective === obj.id
                      ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)] ring-2 ring-[hsl(var(--color-primary)/0.2)]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'}
                 `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(var(--color-secondary)/0.1)] flex items-center justify-center text-xl text-[hsl(var(--color-secondary))]">
                      {obj.icon}
                    </div>
                    {selectedObjective === obj.id && (
                      <div className="w-5 h-5 rounded-full bg-[hsl(var(--color-primary))] flex items-center justify-center animate-in zoom-in duration-200">
                        <span className="material-symbols-outlined text-white text-xs">check</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{obj.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{obj.description}</p>
                </div>
              ))
          )}
        </div>

        {selectedObjective && agents.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-slate-400 text-sm">groups</span>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agentes especializados en este objetivo</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  onClick={() => setViewingAgent(agent)}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-xs">person</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                    {agent.name}
                  </span>
                  <span className="material-symbols-outlined text-xs text-slate-400 group-hover:text-[hsl(var(--color-primary))]">info</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent Info Sub-Modal */}
        {viewingAgent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setViewingAgent(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl mb-6 bg-slate-100 ">
                  {viewingAgent.avatar_url ? (
                    <img src={viewingAgent.avatar_url} alt={viewingAgent.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-sm">verified_user</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--color-primary))]">Agente Certificado</span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-4">{viewingAgent.name}</h3>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 w-full mb-6">
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "{viewingAgent.description}"
                  </p>
                </div>

                <Button className="w-full py-4 rounded-2xl" onClick={() => setViewingAgent(null)}>
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 ">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreateChat} disabled={!selectedObjective || creating} isLoading={creating}>
            Comenzar Chat
          </Button>
        </div>
      </div>
    </Modal>
  );
};
