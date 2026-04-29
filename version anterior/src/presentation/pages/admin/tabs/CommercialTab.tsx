import React from 'react';
import { KpiCard } from '../components/KpiCard';
import { mockData } from '../mockData';

interface CommercialTabProps {
  onOpenKpi: (data: any) => void;
}

export const CommercialTab: React.FC<CommercialTabProps> = ({ onOpenKpi }) => {
  const { commercial: data } = mockData;
  const forecastPercent = (data.forecast.current / data.forecast.target) * 100;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700 delay-75">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pipeline Comercial</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ventas, deals y embudo de conversión</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Win Rate" 
          value={data.winRate.value} 
          delta={data.winRate.delta} 
          isPositive={data.winRate.isPositive} 
          freq={data.winRate.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Win Rate",
            value: data.winRate.value,
            description: "Porcentaje de oportunidades cerradas con éxito frente al total de oportunidades finalizadas.",
            history: [{ date: "Q1 2026", value: 34 }, { date: "Q4 2025", value: 32 }]
          })}
        />
        <KpiCard 
          label="Ciclo de Venta" 
          value={data.salesCycle.value} 
          delta={data.salesCycle.delta} 
          isPositive={data.salesCycle.isPositive} 
          freq={data.salesCycle.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Ciclo de Venta Promedio",
            value: data.salesCycle.value,
            description: "Tiempo medio en días desde el primer contacto hasta el cierre del contrato.",
            history: [{ date: "Marzo", value: 42 }, { date: "Febrero", value: 45 }]
          })}
        />
        <KpiCard 
          label="ACV Promedio" 
          value={data.acv.value} 
          delta={data.acv.delta} 
          isPositive={data.acv.isPositive} 
          freq={data.acv.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Annual Contract Value (ACV)",
            value: data.acv.value,
            description: "Valor anual promedio de los contratos cerrados con nuevos clientes.",
            history: [{ date: "2026", value: 12500 }, { date: "2025", value: 11800 }]
          })}
        />
        <KpiCard 
          label="Lead a Cliente" 
          value={data.leadToClient.value} 
          delta={data.leadToClient.delta} 
          isPositive={data.leadToClient.isPositive} 
          freq={data.leadToClient.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Lead to Customer Rate",
            value: data.leadToClient.value,
            description: "Porcentaje de leads que terminan convirtiéndose en clientes de pago.",
            history: [{ date: "Actual", value: 2.4 }, { date: "Meta", value: 3.5 }]
          })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Pipeline Visual */}
        <div className="card-premium p-6 lg:col-span-2">
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Estado del Pipeline</h3>
          <div className="flex h-48 items-end gap-2 text-center pb-8 border-b border-slate-200 dark:border-slate-800 relative">
            {data.pipeline.map((stage, i) => {
              const maxCount = data.pipeline[0].count;
              const heightPercent = (stage.count / maxCount) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end group">
                  <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{stage.value}</div>
                    <div className="text-[10px] text-slate-500">{stage.count} leads</div>
                  </div>
                  <div 
                    className="w-full bg-[hsl(var(--color-secondary)/0.6)] hover:bg-[hsl(var(--color-secondary))] transition-colors rounded-t-sm"
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                  <div className="absolute -bottom-6 w-full text-xs font-medium text-slate-500 truncate px-1">
                    {stage.stage}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Forecast */}
        <div className="card-premium p-6 flex flex-col justify-center">
            <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white text-center">Forecast vs Meta (Mes)</h3>
            <div className="relative w-48 h-48 mx-auto">
              {/* Simple CSS Donut approximation */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-[hsl(var(--color-primary))]"
                  strokeDasharray={`${forecastPercent}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">${(data.forecast.current/1000).toFixed(0)}k</span>
                <span className="text-xs text-slate-500">de ${(data.forecast.target/1000).toFixed(0)}k</span>
              </div>
            </div>
            <p className="text-center mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
               En camino a superar la meta 🔥
            </p>
        </div>
      </div>

      <div className="card-premium p-6 mt-6">
        <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Recent Deals</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pb-3 text-slate-500 font-medium">Empresa</th>
                <th className="pb-3 text-slate-500 font-medium">Etapa</th>
                <th className="pb-3 text-slate-500 font-medium text-right">Valor</th>
                <th className="pb-3 text-slate-500 font-medium text-right">Días en Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {data.recentDeals.map((deal, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">{deal.company}</td>
                  <td className="py-3">
                    <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded text-xs font-medium">
                      {deal.stage}
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{deal.value}</td>
                  <td className="py-3 text-right text-slate-500">{deal.days} d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
