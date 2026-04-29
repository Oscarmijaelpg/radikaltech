import React, { useEffect, useState } from 'react';
import { KpiCard } from '../components/KpiCard';
import { FunnelChart } from '../components/FunnelChart';
import { mockData } from '../mockData';
import { SupabaseAdminRepository } from '../../../../infrastructure/repositories/SupabaseAdminRepository';
import { GetDashboardStatsUseCase } from '../../../../core/application/use-cases/admin/GetDashboardStatsUseCase';

interface ProductTabProps {
  onOpenKpi: (data: any) => void;
}

export const ProductTab: React.FC<ProductTabProps> = ({ onOpenKpi }) => {
  const [stats, setStats] = useState(mockData.product);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const repo = new SupabaseAdminRepository();
        const useCase = new GetDashboardStatsUseCase(repo);
        const realStats = await useCase.execute();

        const activationRateVal = realStats.totalUsers > 0 
          ? Math.round((realStats.onboardedUsers / realStats.totalUsers) * 100) 
          : 0;

        setStats(prev => ({
          ...prev,
          funnel: [
            { step: "Visitas", value: 1200 }, // Remains mock
            { step: "Registros", value: realStats.totalUsers },
            { step: "Onboarding", value: realStats.onboardedUsers },
            { step: "Aha", value: Math.round(realStats.onboardedUsers * 0.7) }, // Estimate Aha moment based on onboarding
          ],
          activationRate: { ...prev.activationRate, value: `${activationRateVal}%` }
        }));
      } catch (e) {
        console.error("Failed to load real admin stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Métricas de Producto</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Uso, retención y satisfacción</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <FunnelChart data={stats.funnel} />
        </div>
        <div className="grid grid-cols-1 gap-6">
          <KpiCard 
            label="Activation Rate" 
            value={stats.activationRate.value} 
            delta={stats.activationRate.delta} 
            isPositive={stats.activationRate.isPositive} 
            freq={stats.activationRate.freq} 
            isConnected={!loading} // Viene de los stats reales calculados en useEffect
            onClick={() => onOpenKpi({
              label: "Tasa de Activaciones",
              value: stats.activationRate.value,
              description: "Porcentaje de usuarios registrados que completan exitosamente el onboarding.",
              history: [{ date: "Semana Actual", value: 68 }, { date: "Semana Pasada", value: 65 }]
            })}
          />
          <KpiCard 
            label="Cohort Retention S4" 
            value={stats.cohortRetention.value} 
            delta={stats.cohortRetention.delta} 
            isPositive={stats.cohortRetention.isPositive} 
            freq={stats.cohortRetention.freq} 
            isConnected={false}
            onClick={() => onOpenKpi({
              label: "Retención de Cohorte (Semana 4)",
              value: stats.cohortRetention.value,
              description: "Porcentaje de usuarios que siguen activos 4 semanas después de su registro.",
              history: [{ date: "Marzo", value: 42.8 }, { date: "Febrero", value: 40.5 }]
            })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <KpiCard 
          label="NPS Score" 
          value={stats.nps.value} 
          delta={stats.nps.delta} 
          isPositive={stats.nps.isPositive} 
          freq={stats.nps.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Net Promoter Score (NPS)",
            value: stats.nps.value,
            description: "Índice que mide la lealtad y probabilidad de recomendación de los usuarios.",
            history: [{ date: "Q1", value: 72 }, { date: "Q4", value: 68 }]
          })}
        />
        <KpiCard 
          label="CSAT" 
          value={stats.csat.value} 
          delta={stats.csat.delta} 
          isPositive={stats.csat.isPositive} 
          freq={stats.csat.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Customer Satisfaction (CSAT)",
            value: stats.csat.value,
            description: "Puntuación de satisfacción específica tras interacciones clave (soporte, features nuevas).",
            history: [{ date: "Últimos 30d", value: 4.8 }, { date: "Anterior", value: 4.6 }]
          })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Support Tickets Table */}
        <div className="card-premium p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Tickets Recientes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-3 text-slate-500 font-medium">ID</th>
                  <th className="pb-3 text-slate-500 font-medium">Usuario</th>
                  <th className="pb-3 text-slate-500 font-medium">Categoría</th>
                  <th className="pb-3 text-slate-500 font-medium">Estado</th>
                  <th className="pb-3 text-slate-500 font-medium text-right">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {stats.supportTickets.map((ticket, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="py-3 font-medium">{ticket.id}</td>
                    <td className="py-3">{ticket.user}</td>
                    <td className="py-3">{ticket.category}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        ticket.status === 'Abierto' ? 'bg-rose-100 text-rose-700' :
                        ticket.status === 'En progreso' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-500">{ticket.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Features Bars */}
        <div className="card-premium p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Top Features (WAU)</h3>
          <div className="space-y-5">
            {stats.topFeatures.map((feat, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{feat.name}</span>
                  <span className="text-slate-500">{feat.users} act. ({feat.percentage}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[hsl(var(--color-primary))] rounded-full"
                    style={{ width: `${feat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
