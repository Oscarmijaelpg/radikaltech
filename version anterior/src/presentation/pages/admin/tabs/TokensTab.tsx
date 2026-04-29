import React from 'react';
import { PRICING_TR, COP_PER_TR, TOKEN_PACKAGES, PREDEFINED_PRODUCTS } from '../../../../core/domain/constants/pricing';

interface TokensTabProps {
  onOpenKpi?: (data: any) => void;
}

export const TokensTab: React.FC<TokensTabProps> = ({ onOpenKpi }) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      
      {/* Header section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-xl font-bold text-slate-800">Tokens y Configuración de Cobro</h2>
             <p className="text-sm text-slate-500 mt-1">
                 Administra las tarifas base, la conversión a COP y los paquetes prepago.
             </p>
         </div>
         <div className="flex items-center gap-3 bg-[hsl(var(--color-bg-light))] px-4 py-2 rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">currency_exchange</span>
            <div>
               <div className="text-xs text-slate-500 font-medium">Tasa Actual</div>
               <div className="font-black text-slate-800">1 TR = {COP_PER_TR} COP</div>
            </div>
         </div>
      </div>

      {/* Welcome Bonus Configuration */}
      <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <span className="material-symbols-outlined text-3xl">redeem</span>
              </div>
              <div>
                  <h3 className="font-bold text-slate-800">Bono de Bienvenida</h3>
                  <p className="text-sm text-slate-500">Configura los tokens gratuitos para nuevos usuarios.</p>
              </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex-1 md:flex-none">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Tokens (TR)</div>
                  <div className="w-24 px-4 py-2 bg-white rounded-xl border border-emerald-200 font-black text-slate-800">1.000</div>
              </div>
              <div className="flex-1 md:flex-none">
                  <div className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Vigencia (Días)</div>
                  <div className="w-24 px-4 py-2 bg-white rounded-xl border border-emerald-200 font-black text-slate-800">15</div>
              </div>
              <button className="mt-5 p-2 bg-white rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                  <span className="material-symbols-outlined">edit</span>
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tarifario Base */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">receipt_long</span>
                <h3 className="font-bold text-slate-800">Tarifario Base (Por Consumo)</h3>
            </div>
            
            <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">Base Fee (Por Trabajo)</span>
                    <span className="font-bold text-slate-800">{PRICING_TR.BASE_FEE_JOB} TR <span className="text-xs text-slate-400 font-normal">(${PRICING_TR.BASE_FEE_JOB * COP_PER_TR})</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">LLM Input (1k tokens)</span>
                    <span className="font-bold text-slate-800">{PRICING_TR.LLM_INPUT_1K} TR <span className="text-xs text-slate-400 font-normal">(${PRICING_TR.LLM_INPUT_1K * COP_PER_TR})</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">LLM Output (1k tokens)</span>
                    <span className="font-bold text-slate-800">{PRICING_TR.LLM_OUTPUT_1K} TR <span className="text-xs text-slate-400 font-normal">(${PRICING_TR.LLM_OUTPUT_1K * COP_PER_TR})</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">Búsqueda Web (SerpAPI)</span>
                    <span className="font-bold text-slate-800">{PRICING_TR.SERPAPI_SEARCH} TR <span className="text-xs text-slate-400 font-normal">(${PRICING_TR.SERPAPI_SEARCH * COP_PER_TR})</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">Extracción URL (Tavily)</span>
                    <span className="font-bold text-slate-800">{PRICING_TR.TAVILY_EXTRACTION} TR <span className="text-xs text-slate-400 font-normal">(${PRICING_TR.TAVILY_EXTRACTION * COP_PER_TR})</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">Imagen IA (1K)</span>
                    <span className="font-bold text-slate-800">{PRICING_TR.IMAGE_1K} TR <span className="text-xs text-slate-400 font-normal">(${PRICING_TR.IMAGE_1K * COP_PER_TR})</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">Imagen IA (2K)</span>
                    <span className="font-bold text-slate-800">{PRICING_TR.IMAGE_2K} TR <span className="text-xs text-slate-400 font-normal">(${PRICING_TR.IMAGE_2K * COP_PER_TR})</span></span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                    <span className="text-sm font-medium text-slate-600">Imagen IA (4K)</span>
                    <span className="font-bold text-slate-800">{PRICING_TR.IMAGE_4K} TR <span className="text-xs text-slate-400 font-normal">(${PRICING_TR.IMAGE_4K * COP_PER_TR})</span></span>
                </div>
            </div>
            <button className="w-full py-3 rounded-xl font-bold border-2 border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))] hover:bg-primary/5 transition-colors">
                Editar Tarifas Base
            </button>
        </div>

        <div className="space-y-6">
            {/* Paquetes Prepago */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">storefront</span>
                    <h3 className="font-bold text-slate-800">Paquetes Prepago (Top-Up)</h3>
                </div>
                
                <div className="space-y-3">
                    {Object.entries(TOKEN_PACKAGES).map(([key, pack]: [string, any]) => (
                        <div key={key} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div>
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    {key.charAt(0) + key.slice(1).toLowerCase()}
                                    {pack.bonusTokens > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                            +{pack.bonusTokens} Bonus
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {pack.totalTokens} TR Total en saldo
                                </div>
                            </div>
                            <div className="font-black text-lg text-[hsl(var(--color-primary))] bg-primary/5 px-4 py-2 rounded-xl text-center">
                                ${pack.price.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>

      {/* Productos Empaquetados */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">inventory_2</span>
                <h3 className="font-bold text-slate-800">Productos Empaquetados (Precios Fijos)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {Object.entries(PREDEFINED_PRODUCTS).map(([key, product]: [string, any]) => (
                    <div key={key} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                        <div className="font-bold text-sm text-slate-800 h-10 line-clamp-2">{product.name}</div>
                        <div className="mt-4 flex items-end justify-between">
                            <span className="font-black text-xl text-[hsl(var(--color-primary))]">{product.price} TR</span>
                            <span className="text-xs text-slate-500 font-medium">${product.cop.toLocaleString()}</span>
                        </div>
                    </div>
                ))}
            </div>
      </div>
    
    </div>
  );
};
