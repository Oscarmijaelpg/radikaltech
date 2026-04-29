
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CompetitorInput, CompetitorSocialAccount } from '../../../core/application/services/CompetitionAnalysisService';
import { useAuth } from '../../context/AuthContext';

interface CompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (competitors: CompetitorInput[], mode: 'combine' | 'social_only') => void;
  isAnalyzing: boolean;
  user: any;
}

export const CompetitorModal: React.FC<CompetitorModalProps> = ({ isOpen, onClose, onStart, isAnalyzing, user }) => {
  const [competitors, setCompetitors] = useState<CompetitorInput[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'combine' | 'social_only'>('social_only');
  const { updateOnboarding } = useAuth();
  
  const [pendingUserAccount, setPendingUserAccount] = useState<{network: string, compIndex: number} | null>(null);
  const [userAccountUrl, setUserAccountUrl] = useState('');
  const [isSavingUserAccount, setIsSavingUserAccount] = useState(false);

  const addCompetitor = () => {
    setCompetitors([...competitors, { name: '', accounts: [] }]);
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const updateCompetitorName = (index: number, name: string) => {
    const newComps = [...competitors];
    newComps[index].name = name;
    setCompetitors(newComps);
  };

  const addAccount = (compIndex: number, network: CompetitorSocialAccount['network']) => {
    // Check if user has this network
    const networkKey = network === 'x' ? 'Twitter/X' : network.charAt(0).toUpperCase() + network.slice(1);
    
    let userHasNetwork = false;
    if (user?.additional_context) {
      try {
        const parsed = JSON.parse(user.additional_context);
        userHasNetwork = !!(parsed.social_links?.[networkKey]?.[0]);
      } catch (e) {
        console.warn("Failed to parse user accounts:", e);
      }
    }

    if (!userHasNetwork) {
      setPendingUserAccount({ network, compIndex });
      setUserAccountUrl('');
      return;
    }

    const newComps = [...competitors];
    newComps[compIndex].accounts.push({ network, url: '' });
    setCompetitors(newComps);
  };

  const handleSaveUserAccount = async () => {
    if (!pendingUserAccount || !userAccountUrl || !user) return;
    setIsSavingUserAccount(true);
    try {
      const currentContext = user.additional_context ? JSON.parse(user.additional_context) : {};
      const networkKey = pendingUserAccount.network === 'x' ? 'Twitter/X' : pendingUserAccount.network.charAt(0).toUpperCase() + pendingUserAccount.network.slice(1);
      
      const socialLinks = currentContext.social_links || {};
      socialLinks[networkKey] = [userAccountUrl];
      
      const updatedContext = {
        ...currentContext,
        social_links: socialLinks
      };

      await updateOnboarding({
        additional_context: JSON.stringify(updatedContext)
      });
      
      // After saving, add the competitor account
      const { compIndex, network } = pendingUserAccount;
      const newComps = [...competitors];
      newComps[compIndex].accounts.push({ network: network as any, url: '' });
      setCompetitors(newComps);
      
      // Reset state
      setPendingUserAccount(null);
      setUserAccountUrl('');
    } catch (e) {
      console.error(e);
      alert("Error al guardar tu cuenta.");
    } finally {
      setIsSavingUserAccount(false);
    }
  };

  const updateAccountUrl = (compIndex: number, accIndex: number, url: string) => {
    const newComps = [...competitors];
    newComps[compIndex].accounts[accIndex].url = url;
    setCompetitors(newComps);
  };

  const removeAccount = (compIndex: number, accIndex: number) => {
    const newComps = [...competitors];
    newComps[compIndex].accounts = newComps[compIndex].accounts.filter((_, i) => i !== accIndex);
    setCompetitors(newComps);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Configurar Análisis de Competencia"
      maxWidth="2xl"
    >
      <div className="space-y-6 p-4">
        {pendingUserAccount && (
          <div className="bg-[hsl(var(--color-primary)/0.05)] border border-[hsl(var(--color-primary)/0.2)] rounded-3xl p-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-lg">
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${pendingUserAccount.network === 'x' ? 'twitter' : pendingUserAccount.network}.com&sz=32`} 
                  className="w-6 h-6"
                  alt={pendingUserAccount.network}
                />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Primero añade tu cuenta</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Detectamos que no has añadido tu cuenta de <span className="capitalize">{pendingUserAccount.network === 'x' ? 'Twitter/X' : pendingUserAccount.network}</span>. Hazlo ahora para que Kronos pueda realizar una comparativa estratégica.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                className="flex-1 px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.2)] outline-none transition-all"
                placeholder={`Tu URL o @usuario de ${pendingUserAccount.network === 'x' ? 'Twitter/X' : pendingUserAccount.network}`}
                value={userAccountUrl}
                autoFocus
                onChange={(e) => setUserAccountUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="primary" 
                  onClick={handleSaveUserAccount}
                  isLoading={isSavingUserAccount}
                  disabled={!userAccountUrl}
                >
                  Guardar y Continuar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setPendingUserAccount(null);
                    setUserAccountUrl('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {competitors.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500 text-sm">No has agregado competidores aún.</p>
              <Button onClick={addCompetitor} variant="outline" className="mt-4" size="sm">
                Agregar el primero
              </Button>
            </div>
          ) : (
            competitors.map((comp, cIdx) => (
              <div key={cIdx} className="p-6 border border-slate-200 rounded-3xl space-y-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 border-b-2 border-slate-100 focus-within:border-[hsl(var(--color-secondary))] transition-colors pb-1">
                    <input 
                      className="w-full text-xl font-black bg-transparent outline-none text-slate-900 placeholder:text-slate-300"
                      placeholder="Nombre del Competidor"
                      value={comp.name}
                      autoFocus
                      onChange={(e) => updateCompetitorName(cIdx, e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => removeCompetitor(cIdx)} 
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'instagram', color: '#E4405F' },
                    { id: 'facebook', color: '#1877F2' },
                    { id: 'tiktok', color: '#000000' },
                    { id: 'youtube', color: '#FF0000' },
                    { id: 'x', color: '#000000', iconDomain: 'twitter.com' },
                    { id: 'linkedin', color: '#0077B5' }
                  ].map((net) => {
                    const isEnabled = net.id === 'instagram' || net.id === 'tiktok';
                    return (
                      <button 
                        key={net.id}
                        onClick={() => isEnabled && addAccount(cIdx, net.id as any)}
                        disabled={!isEnabled}
                        style={{ '--hover-color': net.color } as any}
                        className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-2 group ${
                          isEnabled 
                            ? 'border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest hover:border-[var(--hover-color)] hover:bg-white hover:shadow-sm' 
                            : 'border-slate-100 bg-slate-50 opacity-40 grayscale cursor-not-allowed'
                        }`}
                        title={isEnabled ? `Agregar ${net.id}` : `${net.id} (Próximamente)`}
                      >
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${net.iconDomain || net.id + '.com'}&sz=32`} 
                          className="w-4 h-4"
                          alt={net.id}
                        />
                        <span className={`${isEnabled ? 'group-hover:text-slate-900 text-slate-500' : 'text-slate-400 font-medium'}`}>
                          {net.id} {!isEnabled && <span className="text-[8px] normal-case opacity-60"> (Próximamente)</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  {comp.accounts.map((acc, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${acc.network === 'x' ? 'twitter' : acc.network}.com&sz=32`} 
                          className="w-5 h-5"
                          alt={acc.network}
                        />
                      </div>
                      <input 
                        className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[hsl(var(--color-primary)/0.2)] focus:bg-white outline-none transition-all"
                        placeholder={`URL de la cuenta de ${acc.network}`}
                        value={acc.url}
                        onChange={(e) => updateAccountUrl(cIdx, aIdx, e.target.value)}
                      />
                      <button 
                        onClick={() => removeAccount(cIdx, aIdx)} 
                        className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-4">
          <button 
            onClick={addCompetitor}
            className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--color-primary))] hover:opacity-80 transition-opacity"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Añadir otro competidor
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <button 
              onClick={() => setAnalysisMode('social_only')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${analysisMode === 'social_only' ? 'border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)]' : 'border-slate-100 opacity-60'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">monitoring</span>
              </div>
              <span className="font-bold block text-slate-900">Solo Redes</span>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight">Análisis de engagement, likes y comentarios.</span>
            </button>
            <button 
              onClick={() => setAnalysisMode('combine')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${analysisMode === 'combine' ? 'border-[hsl(var(--color-secondary))] bg-[hsl(var(--color-secondary)/0.05)]' : 'border-slate-100 opacity-60'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[hsl(var(--color-secondary))]">trending_up</span>
              </div>
              <span className="font-bold block text-slate-900">Misión Especial</span>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight">Investigación profunda de mercado y tendencias 2025.</span>
            </button>
          </div>

          <Button 
            onClick={() => onStart(competitors, analysisMode)}
            variant="primary" 
            className="w-full h-14 text-lg mt-4"
            isLoading={isAnalyzing}
            disabled={isAnalyzing || competitors.length === 0}
          >
            Lanzar Análisis Estratégico
          </Button>
        </div>
      </div>
    </Modal>
  );
};
