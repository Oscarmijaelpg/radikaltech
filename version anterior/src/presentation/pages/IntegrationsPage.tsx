
import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const IntegrationCard = ({ name, desc, icon, connected = false }: { name: string, desc: string, icon: string, connected?: boolean }) => (
  <Card className="flex flex-col sm:flex-row items-center gap-4 group p-4 md:p-6 text-center sm:text-left">
    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
      {icon.startsWith('http') ? <img src={icon} alt={name} className="w-8 h-8 object-contain" /> : <span className="material-symbols-outlined">{icon}</span>}
    </div>
    <div className="flex-1 min-w-0 w-full sm:w-auto">
      <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{name}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-xs truncate sm:whitespace-normal">{desc}</p>
    </div>
    <Button variant={connected ? 'outline' : 'primary'} size="sm" className="w-full sm:w-auto">
      {connected ? 'Config' : 'Connect'}
    </Button>
  </Card>
);

export const IntegrationsPage: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-[hsl(var(--color-bg-light))] dark:bg-[hsl(var(--color-bg-dark))]">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 font-display">Integrations</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Potencia tu inteligencia competitiva con datos en tiempo real.</p>
        </header>

        <section className="relative overflow-hidden p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-[hsl(var(--color-secondary))] to-slate-900 text-white shadow-2xl border border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 relative z-10 text-center md:text-left">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-extrabold mb-3 md:mb-4 font-display">Conecta tus apps a Radikal</h2>
              <p className="text-white/90 max-w-xl text-base md:text-lg leading-relaxed">
                Empodera a tus ayudantes de IA con datos en tiempo real y publicaciones automáticas.
              </p>
            </div>
            <Button size="lg" className="w-full md:w-auto bg-white text-slate-900 hover:bg-white/90">
              Explorar Catálogo
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          <IntegrationCard 
            name="LinkedIn" 
            desc="Crea y comparte publicaciones." 
            icon="https://cdn-icons-png.flaticon.com/512/174/174857.png" 
          />
          <IntegrationCard 
            name="Instagram" 
            desc="Gestiona Instagram Business." 
            icon="https://cdn-icons-png.flaticon.com/512/174/174855.png" 
          />
          <IntegrationCard 
            name="Gmail" 
            desc="Envío de correos automatizados." 
            icon="https://cdn-icons-png.flaticon.com/512/5968/5968534.png" 
            connected
          />
           <IntegrationCard 
            name="Slack" 
            desc="Notificaciones en tiempo real." 
            icon="https://cdn-icons-png.flaticon.com/512/2111/2111615.png" 
          />
        </div>
      </div>
    </div>
  );
};
