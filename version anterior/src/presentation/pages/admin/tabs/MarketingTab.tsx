import React from 'react';
import { KpiCard } from '../components/KpiCard';
import { mockData } from '../mockData';

interface MarketingTabProps {
  onOpenKpi: (data: any) => void;
}

export const MarketingTab: React.FC<MarketingTabProps> = ({ onOpenKpi }) => {
  const { marketing: data } = mockData;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700 delay-150">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing y Marca</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Adquisición, canales y comunidad</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <KpiCard 
          label="Sesiones Web" 
          value={data.traffic.value} 
          delta={data.traffic.delta} 
          isPositive={data.traffic.isPositive} 
          freq={data.traffic.freq} 
          className="xl:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Sesiones Web",
            value: data.traffic.value,
            description: "Número total de sesiones únicas en el sitio web durante el último periodo.",
            history: [{ date: "Hoy", value: 12400 }, { date: "Ayer", value: 11900 }]
          })}
        />
        <KpiCard 
          label="CVR a Lead" 
          value={data.cvr.value} 
          delta={data.cvr.delta} 
          isPositive={data.cvr.isPositive} 
          freq={data.cvr.freq} 
          className="xl:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Tasa de Conversión a Lead",
            value: data.cvr.value,
            description: "Porcentaje de visitantes web que se convierten en leads registrados.",
            history: [{ date: "Este Mes", value: 3.2 }, { date: "Mes Anterior", value: 2.8 }]
          })}
        />
        <KpiCard 
          label="MQL a SQL" 
          value={data.mqlSql.value} 
          delta={data.mqlSql.delta} 
          isPositive={data.mqlSql.isPositive} 
          freq={data.mqlSql.freq} 
          className="xl:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "MQL a SQL",
            value: data.mqlSql.value,
            description: "Tasa de conversión de Marketing Qualified Leads a Sales Qualified Leads.",
            history: [{ date: "Q1", value: 45 }, { date: "Q4 Prev", value: 42 }]
          })}
        />
        
        <KpiCard 
          label="Búsquedas Marca" 
          value={data.brandedSearch.value} 
          delta={data.brandedSearch.delta} 
          isPositive={data.brandedSearch.isPositive} 
          freq={data.brandedSearch.freq} 
          className="xl:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Búsquedas de Marca",
            value: data.brandedSearch.value,
            description: "Número de búsquedas en Google que contienen el nombre 'Radikal IA'.",
            history: [{ date: "Semana 10", value: 856 }, { date: "Semana 9", value: 720 }]
          })}
        />
        <KpiCard 
          label="SOV" 
          value={data.sov.value} 
          delta={data.sov.delta} 
          isPositive={data.sov.isPositive} 
          freq={data.sov.freq} 
          className="xl:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Share of Voice (SOV)",
            value: data.sov.value,
            description: "Cuota de visibilidad de la marca en comparación con los competidores en canales digitales.",
            history: [{ date: "Actual", value: 18 }, { date: "Objetivo", value: 25 }]
          })}
        />
        <KpiCard 
          label="Referral Rate" 
          value={data.referralRate.value} 
          delta={data.referralRate.delta} 
          isPositive={data.referralRate.isPositive} 
          freq={data.referralRate.freq} 
          className="xl:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Tasa de Referidos",
            value: data.referralRate.value,
            description: "Porcentaje de nuevos usuarios que llegan a través de invitaciones de usuarios existentes.",
            history: [{ date: "Marzo", value: 12.5 }, { date: "Febrero", value: 10.2 }]
          })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card-premium p-6">
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">CAC por Canal</h3>
          <div className="space-y-6">
            {data.cacChannels.map((item, i) => {
              // Mock calculation based on strings for visualization purposes only
              const val = parseInt(item.cac.replace('$', '').replace(',', ''));
              let width = "30%";
              if(val > 1000) width = "95%";
              else if(val > 800) width = "70%";
              else if(val > 100) width = "25%";
              else width = "10%";
              
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-600 dark:text-slate-400">{item.channel}</div>
                  <div className="flex-1">
                    <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-sm relative group overflow-hidden">
                      <div 
                        className={`h-full bg-[hsl(var(--color-primary))] transition-all group-hover:brightness-110 ease-out`}
                        style={{ width }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-16 text-right font-bold text-slate-900 dark:text-white">{item.cac}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-premium p-6">
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Crecimiento de Comunidad</h3>
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700"></div>
            {data.communityGrowth.map((point, i) => (
              <div key={i} className="relative flex items-center justify-between">
                <div className="absolute -left-6 w-6 flex justify-center">
                  <div className={`w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${i === data.communityGrowth.length - 1 ? 'bg-[hsl(var(--color-primary))] ring-4 ring-[hsl(var(--color-primary)/0.2)]' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                </div>
                <div className="text-sm font-medium text-slate-500">{point.week}</div>
                <div className="font-bold text-slate-900 dark:text-white">{point.followers.toLocaleString()} seguidores</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
