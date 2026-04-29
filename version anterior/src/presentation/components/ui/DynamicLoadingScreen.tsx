import React, { useState, useEffect } from 'react';
import ankorImage from '../../../media/ankor.webp';
import kronosImage from '../../../media/Kronos.webp';

interface DynamicLoadingScreenProps {
  title: string;
  subtitle: string;
}

const MARKETING_TIPS = [
  {
    title: "Estrategia de Contenido",
    content: "Crea contenido que resuelva problemas reales de tu audiencia. El valor educativo genera una lealtad de marca 3 veces superior a la promocional."
  },
  {
    title: "Consistencia de Marca",
    content: "Mantener una identidad visual y tono de voz coherente en todos los canales puede aumentar los ingresos hasta en un 23%."
  },
  {
    title: "Optimización SEO",
    content: "El 70% de los clics en buscadores van a los resultados orgánicos. Asegúrate de que tu sitio web cargue rápido y sea 'mobile-friendly'."
  },
  {
    title: "Engagement en Redes",
    content: "No solo publiques, interactúa. Responder a los comentarios en las primeras 2 horas aumenta el alcance algorítmico considerablemente."
  },
  {
    title: "Video Marketing",
    content: "Incluir un video en una landing page puede aumentar las conversiones en más del 80%. La gente conecta mejor con lo visual."
  }
];

export const DynamicLoadingScreen: React.FC<DynamicLoadingScreenProps> = ({ title, subtitle }) => {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % MARKETING_TIPS.length);
    }, 6000);
    return () => clearInterval(tipInterval);
  }, []);

  const nextTip = () => setCurrentTip(prev => (prev + 1) % MARKETING_TIPS.length);
  const prevTip = () => setCurrentTip(prev => (prev - 1 + MARKETING_TIPS.length) % MARKETING_TIPS.length);

  return (
    <div className="relative w-full rounded-[2.5rem] bg-white border border-slate-200 p-8 lg:p-12 overflow-hidden shadow-sm flex flex-col items-center justify-center min-h-[500px]">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden rounded-[2.5rem]">
        <div className="absolute top-0 -left-20 w-[400px] h-[400px] bg-[hsl(var(--color-primary)/0.03)] rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute bottom-0 -right-20 w-[400px] h-[400px] bg-[hsl(var(--color-secondary)/0.03)] rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side: Loading Animation & Status */}
        <div className="flex flex-col items-center lg:items-start space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-[hsl(var(--color-primary)/0.2)] rounded-[2rem] blur-2xl group-hover:blur-[40px] transition-all"></div>
            <div className="relative w-32 h-32 lg:w-48 lg:h-48 rounded-[2rem] border-4 border-white shadow-xl overflow-hidden bg-white">
              <img src={kronosImage} alt="Kronos" className="w-full h-full object-contain animate-float" />
            </div>
            {/* Pulsing Scan Ring */}
            <div className="absolute -inset-4 border-4 border-dashed border-[hsl(var(--color-primary))] rounded-[3rem] animate-spin-slow opacity-40"></div>
          </div>

          <div className="space-y-4 w-full max-w-md text-center lg:text-left">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-slate-500 italic">
              {subtitle}
            </p>

            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Analizando datos</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] animate-pulse"></span>
                  En progreso
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] rounded-full w-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Marketing Tips Slider (Ankor) */}
        <div className="relative flex items-center justify-center lg:justify-end w-full">
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-xl p-8 border border-slate-100 flex flex-col space-y-6">
            <div className="absolute -top-8 -left-8 w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white z-10">
              <img src={ankorImage} alt="Ankor" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] rounded-full text-[10px] font-black uppercase tracking-widest">
                  Tip de Estrategia
                </span>
              </div>

              <div className="min-h-[140px] transition-all duration-500 transform">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{MARKETING_TIPS[currentTip].title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "{MARKETING_TIPS[currentTip].content}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex gap-1">
                  {MARKETING_TIPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === currentTip ? 'w-6 bg-[hsl(var(--color-primary))]' : 'w-2 bg-slate-200'}`}
                    ></div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={prevTip}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-900"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <button
                    onClick={nextTip}
                    className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors text-white"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
              Consejo de Ankor
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1.02); }
          50% { transform: translateY(-8px) scale(1.05); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
