import React from 'react';
import { KpiCard } from '../components/KpiCard';
import { mockData } from '../mockData';

interface FinanceTabProps {
  onOpenKpi: (data: any) => void;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ onOpenKpi }) => {
  const { finance: data } = mockData;

  const wRatioColor = 
    data.workingCapitalRatio >= 1.5 ? 'bg-emerald-500' : 
    data.workingCapitalRatio >= 1.0 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700 delay-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Finanzas y Unit Economics</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Salud financiera y eficiencia de capital</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Cash Balance" 
          value={data.cashBalance.value} 
          delta={data.cashBalance.delta} 
          isPositive={data.cashBalance.isPositive} 
          freq={data.cashBalance.freq} 
          className="lg:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Cash Balance",
            value: data.cashBalance.value,
            description: "Efectivo total disponible en las cuentas operativas de la empresa.",
            history: [{ date: "Marzo", value: 1250000 }, { date: "Febrero", value: 1300000 }]
          })}
          large 
        />
        <KpiCard 
          label="Burn Rate Global" 
          value={data.burnRate.value} 
          delta={data.burnRate.delta} 
          isPositive={data.burnRate.isPositive} 
          freq={data.burnRate.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Burn Rate Global",
            value: data.burnRate.value,
            description: "Cantidad de efectivo neto que la empresa consume cada mes para operar.",
            history: [{ date: "Marzo", value: 85000 }, { date: "Febrero", value: 82000 }]
          })}
          large 
        />
        <KpiCard 
          label="Runway" 
          value={data.runway.value} 
          delta={data.runway.delta} 
          isPositive={data.runway.isPositive} 
          freq={data.runway.freq} 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Runway",
            value: data.runway.value,
            description: "Tiempo estimado (en meses) antes de que la empresa se quede sin efectivo basado en el burn rate actual.",
            history: [{ date: "Actual", value: 14.7 }, { date: "Meta", value: 18 }]
          })}
          large 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mt-6">
        <KpiCard 
          label="Gross Margin" 
          value={data.grossMargin.value} 
          delta={data.grossMargin.delta} 
          isPositive={data.grossMargin.isPositive} 
          freq={data.grossMargin.freq} 
          className="lg:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Gross Margin",
            value: data.grossMargin.value,
            description: "Margen de beneficio bruto después de deducir los costos directos de prestación del servicio.",
            history: [{ date: "Q1", value: 82.4 }, { date: "Q4 Prev", value: 80.5 }]
          })}
        />
        <KpiCard 
          label="LTV Promedio" 
          value={data.ltv.value} 
          delta={data.ltv.delta} 
          isPositive={data.ltv.isPositive} 
          freq={data.ltv.freq} 
          className="lg:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Customer Lifetime Value (LTV)",
            value: data.ltv.value,
            description: "Valor neto promedio que cada cliente aporta durante toda su relación con la plataforma.",
            history: [{ date: "2026", value: 4500 }, { date: "2025", value: 4200 }]
          })}
        />
        <KpiCard 
          label="CAC Mixto" 
          value={data.cac.value} 
          delta={data.cac.delta} 
          isPositive={data.cac.isPositive} 
          freq={data.cac.freq} 
          className="lg:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Coste de Adquisición de Cliente (CAC)",
            value: data.cac.value,
            description: "Inversión promedio necesaria en marketing y ventas para adquirir un nuevo cliente de pago.",
            history: [{ date: "Marzo", value: 850 }, { date: "Febrero", value: 920 }]
          })}
        />
        
        <KpiCard 
          label="LTV:CAC" 
          value={data.ltvCac.value} 
          delta={data.ltvCac.delta} 
          isPositive={data.ltvCac.isPositive} 
          freq={data.ltvCac.freq} 
          className="lg:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Ratio LTV:CAC",
            value: data.ltvCac.value,
            description: "Número de veces que el LTV supera al CAC. Un ratio > 3 indica un modelo de negocio saludable.",
            history: [{ date: "Actual", value: 5.3 }, { date: "Meta", value: 3.0 }]
          })}
        />
        <KpiCard 
          label="Payback Period" 
          value={data.payback.value} 
          delta={data.payback.delta} 
          isPositive={data.payback.isPositive} 
          freq={data.payback.freq} 
          className="lg:col-span-2" 
          isConnected={false}
          onClick={() => onOpenKpi({
            label: "Payback Period",
            value: data.payback.value,
            description: "Tiempo necesario para recuperar el coste de adquisición de un cliente.",
            history: [{ date: "Actual", value: 6.2 }, { date: "Meta", value: 8 }]
          })}
        />
        <div className="grid grid-cols-1 gap-6 lg:col-span-2">
            <KpiCard 
              label="DSO" 
              value={data.dso.value} 
              delta={data.dso.delta} 
              isPositive={data.dso.isPositive} 
              freq={data.dso.freq} 
              isConnected={false}
              onClick={() => onOpenKpi({
                label: "Days Sales Outstanding (DSO)",
                value: data.dso.value,
                description: "Promedio de días que tardan los clientes en pagar sus facturas.",
                history: [{ date: "Marzo", value: 32 }, { date: "Febrero", value: 34 }]
              })}
            />
            <KpiCard 
              label="DPO" 
              value={data.dpo.value} 
              delta={data.dpo.delta} 
              isPositive={data.dpo.isPositive} 
              freq={data.dpo.freq} 
              isConnected={false}
              onClick={() => onOpenKpi({
                label: "Days Payable Outstanding (DPO)",
                value: data.dpo.value,
                description: "Promedio de días que tarda la empresa en pagar a sus proveedores.",
                history: [{ date: "Marzo", value: 45 }, { date: "Febrero", value: 45 }]
              })}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="card-premium p-6 lg:col-span-2">
            <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Cash Flow Operativo (Simulado)</h3>
            <div className="h-48 w-full mt-4 flex items-end relative overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-4">
                {/* SVG Area chart simulation */}
                <svg className="absolute bottom-0 left-0 w-full h-full preserve-3d" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--color-primary))" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="hsl(var(--color-primary))" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>
                    <path d="M0 100 L0 60 L20 45 L40 55 L60 30 L80 40 L100 20 L100 100 Z" fill="url(#areaGrad)" />
                    <path d="M0 60 L20 45 L40 55 L60 30 L80 40 L100 20" fill="none" stroke="hsl(var(--color-primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* Simulated months layer */}
                <div className="absolute bottom-1 w-full flex justify-between px-4 text-xs font-medium text-slate-400">
                    <span>Oct</span><span>Nov</span><span>Dic</span><span>Ene</span><span>Feb</span><span>Mar</span>
                </div>
            </div>
        </div>

        <div className="card-premium p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Working Capital Ratio</h3>
            
            <div className="flex flex-col items-center gap-4 my-6">
                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {data.workingCapitalRatio}x
                </span>
                
                <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Riesgo</span>
                    <span>Saludable</span>
                </div>
                
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                    <div className="h-full bg-rose-500 w-1/3"></div>
                    <div className="h-full bg-amber-400 w-1/3"></div>
                    <div className="h-full bg-emerald-500 w-1/3 relative">
                        {/* Indicator needle */}
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-slate-900 dark:bg-white rounded shadow-sm transition-all duration-1000"
                            style={{ left: data.workingCapitalRatio > 1.5 ? '50%' : '-10%' }}
                        ></div>
                    </div>
                </div>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400">
               Total Activos Circulantes / <br/> Pasivos Circulantes
            </p>
        </div>
      </div>
    </div>
  );
};
