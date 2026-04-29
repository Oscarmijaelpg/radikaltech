import React, { useEffect, useState } from 'react';
import { KpiCard } from '../components/KpiCard';
import { mockData } from '../mockData';
import { SupabaseAdminRepository } from '../../../../infrastructure/repositories/SupabaseAdminRepository';
import { GetDashboardStatsUseCase } from '../../../../core/application/use-cases/admin/GetDashboardStatsUseCase';

interface ExecutiveTabProps {
  onOpenKpi: (data: any) => void;
}

export const ExecutiveTab: React.FC<ExecutiveTabProps> = ({ onOpenKpi }) => {
  const [stats, setStats] = useState(mockData.executive);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const repo = new SupabaseAdminRepository();
        const useCase = new GetDashboardStatsUseCase(repo);
        const realStats = await useCase.execute();

        setStats(prev => ({
          ...prev,
          mrr: { ...prev.mrr, value: `$${realStats.mrr.toLocaleString()}` },
          arr: { ...prev.arr, value: `$${realStats.arr.toLocaleString()}` },
          activeClients: { ...prev.activeClients, value: `${realStats.activeClients}` }
        }));
        setIsConnected(true);
      } catch (e) {
        console.error("Failed to load real admin stats", e);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Resumen Ejecutivo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visión global de los KPIs de negocio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KpiCard 
          label="MRR" 
          value={stats.mrr.value} 
          delta={stats.mrr.delta} 
          isPositive={stats.mrr.isPositive} 
          freq={stats.mrr.freq} 
          isConnected={isConnected}
          onClick={() => onOpenKpi({ 
            label: "Monthly Recurring Revenue", 
            value: stats.mrr.value, 
            description: "Ingresos recurrentes mensuales totales generados por suscripciones activas.",
            history: [
              { date: "Marzo 2026", value: 42800 },
              { date: "Febrero 2026", value: 41000 },
              { date: "Enero 2026", value: 40000 }
            ]
          })}
          large 
        />
        <KpiCard 
          label="ARR" 
          value={stats.arr.value} 
          delta={stats.arr.delta} 
          isPositive={stats.arr.isPositive} 
          freq={stats.arr.freq} 
          isConnected={isConnected}
          onClick={() => onOpenKpi({ 
            label: "Annual Recurring Revenue", 
            value: stats.arr.value, 
            description: "Proyección anualizada de los ingresos recurrentes actuales.",
            history: [
              { date: "2026 Q1", value: 513600 },
              { date: "2025 Q4", value: 480000 }
            ]
          })}
          large 
        />
        <KpiCard 
          label="Clientes Activos" 
          value={stats.activeClients.value} 
          delta={stats.activeClients.delta} 
          isPositive={stats.activeClients.isPositive} 
          freq={stats.activeClients.freq} 
          isConnected={isConnected}
          onClick={() => onOpenKpi({ 
            label: "Clientes Activos", 
            value: stats.activeClients.value, 
            description: "Número total de clientes con al menos una suscripción activa.",
            history: [
              { date: "Hoy", value: 1250 },
              { date: "Ayer", value: 1242 }
            ]
          })}
        />
        <KpiCard 
          label="WAU / MAU" 
          value={stats.wauMau.value} 
          delta={stats.wauMau.delta} 
          isPositive={stats.wauMau.isPositive} 
          freq={stats.wauMau.freq} 
          isConnected={false} // Mock data
          onClick={() => onOpenKpi({ 
            label: "Ratio WAU / MAU", 
            value: stats.wauMau.value, 
            description: "Relación entre usuarios activos semanales y mensuales. Indica el nivel de retención y 'stickiness' de la plataforma.",
            history: [
              { date: "Meta", value: 65 },
              { date: "Actual", value: 62.4 }
            ]
          })}
        />
        
        <KpiCard 
          label="Churn Rate" 
          value={stats.churn.value} 
          delta={stats.churn.delta} 
          isPositive={stats.churn.isPositive} 
          freq={stats.churn.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Churn Rate",
            value: stats.churn.value,
            description: "Porcentaje de clientes que cancelan su suscripción durante un periodo determinado.",
            history: [{ date: "Q1", value: 2.4 }, { date: "Q4 Prev", value: 2.8 }]
          })}
        />
        <KpiCard 
          label="NRR" 
          value={stats.nrr.value} 
          delta={stats.nrr.delta} 
          isPositive={stats.nrr.isPositive} 
          freq={stats.nrr.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Net Revenue Retention (NRR)",
            value: stats.nrr.value,
            description: "Capacidad de generar ingresos a partir de la base de clientes existente, incluyendo expansiones y restando churn.",
            history: [{ date: "Actual", value: 112 }, { date: "Meta", value: 120 }]
          })}
        />
        <KpiCard 
          label="Burn Rate" 
          value={stats.burnRate.value} 
          delta={stats.burnRate.delta} 
          isPositive={stats.burnRate.isPositive} 
          freq={stats.burnRate.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Burn Rate",
            value: stats.burnRate.value,
            description: "Cantidad de efectivo que la empresa consume mensualmente para cubrir sus gastos operativos.",
            history: [{ date: "Marzo", value: 12500 }, { date: "Febrero", value: 13000 }]
          })}
        />
        <KpiCard 
          label="Runway" 
          value={stats.runway.value} 
          delta={stats.runway.delta} 
          isPositive={stats.runway.isPositive} 
          freq={stats.runway.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Runway",
            value: stats.runway.value,
            description: "Meses de vida restantes para la empresa con el flujo de caja actual.",
            history: [{ date: "Actual", value: 18 }, { date: "Meta", value: 24 }]
          })}
        />
        
        <KpiCard 
          label="Uptime" 
          value={stats.uptime.value} 
          delta={stats.uptime.delta} 
          isPositive={stats.uptime.isPositive} 
          freq={stats.uptime.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Uptime del Sistema",
            value: stats.uptime.value,
            description: "Porcentaje de tiempo que los servicios de Radikal IA han estado disponibles sin interrupciones.",
            history: [{ date: "Últimos 30d", value: 99.98 }, { date: "Anterior", value: 99.95 }]
          })}
        />
        <KpiCard 
          label="Pipeline Coverage" 
          value={stats.pipelineCoverage.value} 
          delta={stats.pipelineCoverage.delta} 
          isPositive={stats.pipelineCoverage.isPositive} 
          freq={stats.pipelineCoverage.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Pipeline Coverage",
            value: stats.pipelineCoverage.value,
            description: "Relación entre el valor del pipeline de ventas y la cuota de ingresos establecida.",
            history: [{ date: "Q1", value: 3.2 }, { date: "Meta", value: 3.5 }]
          })}
        />
      </div>

      {/* Line Chart Mock */}
      <div className="card-premium mt-8 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Evolución MRR (últimos 6 meses)</h3>
          <span className="text-sm text-slate-500">Datos simulados</span>
        </div>
        <div className="h-64 mt-4 w-full relative flex items-end gap-2 px-4 pb-8 border-b border-l border-slate-200 dark:border-slate-800">
          {[32, 35, 36, 40, 41, 42.8].map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div 
                className="w-full bg-[hsl(var(--color-primary)/0.2)] hover:bg-[hsl(var(--color-primary)/0.4)] transition-all rounded-t-sm"
                style={{ height: `${(val / 50) * 100}%` }}
              ></div>
              <span className="absolute -bottom-6 text-xs text-slate-400">Mes {i+1}</span>
              <div className="absolute top-0 -translate-y-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                ${val}k
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
