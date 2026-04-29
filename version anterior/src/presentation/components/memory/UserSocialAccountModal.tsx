
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

interface UserSocialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NETWORKS = [
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: 'https://www.google.com/s2/favicons?domain=instagram.com&sz=32' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: 'https://www.google.com/s2/favicons?domain=facebook.com&sz=32' },
  { id: 'tiktok', name: 'TikTok', color: '#000000', icon: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=32' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=32' },
  { id: 'x', name: 'Twitter/X', color: '#000000', icon: 'https://www.google.com/s2/favicons?domain=twitter.com&sz=32' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0077B5', icon: 'https://www.google.com/s2/favicons?domain=linkedin.com&sz=32' }
];

export const UserSocialAccountModal: React.FC<UserSocialAccountModalProps> = ({ isOpen, onClose }) => {
  const { user, updateOnboarding } = useAuth();
  const [socialLinks, setSocialLinks] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.additional_context) {
      try {
        const parsed = JSON.parse(user.additional_context);
        if (parsed.social_links && typeof parsed.social_links === 'object') {
          const cleanedLinks: Record<string, string[]> = {};
          Object.entries(parsed.social_links).forEach(([key, values]) => {
            const valArr = Array.isArray(values) ? values : [values as string];
            const valid = valArr.filter(v => typeof v === 'string' && v.trim() !== '');
            if (valid.length > 0) {
              cleanedLinks[key] = valid;
            }
          });
          setSocialLinks(cleanedLinks);
        }
      } catch (e) {
        console.error("Failed to parse social links from user context", e);
      }
    }
  }, [user]);

  const toggleNetwork = (networkName: string) => {
    setSocialLinks(prev => {
      const newLinks = { ...prev };
      if (newLinks[networkName]) {
        delete newLinks[networkName];
      } else {
        newLinks[networkName] = [''];
      }
      return newLinks;
    });
  };

  const updateLink = (networkName: string, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [networkName]: [value]
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const currentContext = user.additional_context ? JSON.parse(user.additional_context) : {};
      
      const cleanedLinks: Record<string, string[]> = {};
      Object.entries(socialLinks).forEach(([key, values]) => {
        const valArr = Array.isArray(values) ? values : [values as string];
        const valid = valArr.filter(v => typeof v === 'string' && v.trim() !== '');
        if (valid.length > 0) {
          cleanedLinks[key] = valid;
        }
      });

      const updatedContext = {
        ...currentContext,
        social_links: cleanedLinks
      };

      await updateOnboarding({
        additional_context: JSON.stringify(updatedContext)
      });
      onClose();
    } catch (error) {
      console.error("Error saving social accounts", error);
      alert("Error al guardar las cuentas. Por favor intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Agregar cuenta de red social"
      maxWidth="xl"
    >
      <div className="p-6 space-y-6">
        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          Configura tus propias redes sociales. Esto permitirá que cuando analices competidores en estas mismas plataformas, podamos comparar el rendimiento de tu marca contra el de ellos.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {NETWORKS.map((net) => {
            const isEnabled = net.id === 'instagram' || net.id === 'tiktok';
            const isSelected = !!socialLinks[net.name] || (net.id === 'x' && !!socialLinks['Twitter/X']);
            const networkKey = net.id === 'x' ? 'Twitter/X' : net.name;
            
            return (
              <button 
                key={net.id}
                onClick={() => isEnabled && toggleNetwork(networkKey)}
                disabled={!isEnabled}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  isEnabled 
                    ? isSelected 
                      ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)]' 
                      : 'border-slate-100 hover:border-slate-200 bg-white cursor-pointer'
                    : 'border-slate-100 bg-slate-50 opacity-40 grayscale cursor-not-allowed'
                }`}
              >
                <img src={net.icon} className="w-8 h-8" alt={net.name} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isEnabled ? (isSelected ? 'text-[hsl(var(--color-primary))]' : 'text-slate-500') : 'text-slate-400'}`}>
                  {net.name}
                  {!isEnabled && <span className="block text-[8px] normal-case mt-1">(Próximamente)</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
          {Object.entries(socialLinks).map(([name, links]) => (
            <div key={name} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <img 
                    src={NETWORKS.find(n => n.name === name || (n.id === 'x' && name === 'Twitter/X'))?.icon} 
                    className="w-4 h-4" 
                    alt={name} 
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{name}</span>
              </div>
              <input 
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.2)] focus:bg-white outline-none transition-all"
                placeholder={`URL o @usuario de tu cuenta de ${name}`}
                value={links[0] || ''}
                onChange={(e) => updateLink(name, e.target.value)}
              />
            </div>
          ))}
          {Object.keys(socialLinks).length === 0 && (
            <div className="text-center py-6 text-slate-400 italic text-xs">
              Selecciona una red social arriba para configurarla
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100">
          <Button 
            onClick={handleSave}
            variant="primary" 
            className="w-full h-12 text-md"
            isLoading={isSaving}
          >
            Guardar Configuración
          </Button>
        </div>
      </div>
    </Modal>
  );
};
