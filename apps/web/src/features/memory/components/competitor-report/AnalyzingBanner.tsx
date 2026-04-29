import { Card, Icon } from '@radikal/ui';
import { CHARACTERS } from '@/shared/characters';

interface Props {
  competitorName: string;
}

const STAGES = [
  'Leyendo su sitio web',
  'Buscando sus redes sociales',
  'Descargando sus últimos posts',
  'Analizando engagement y estética',
  'Redactando la interpretación',
];

export function AnalyzingBanner({ competitorName }: Props) {
  const sira = CHARACTERS.sira;
  return (
    <Card className="p-6 sm:p-8 bg-gradient-to-br from-rose-50 via-white to-violet-50 border-rose-200">
      <div className="flex flex-col sm:flex-row sm:items-start gap-5">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${sira.accent} p-[2px] shrink-0 animate-pulse`}>
          <div className="w-full h-full rounded-[14px] bg-white overflow-hidden">
            <img src={sira.image} alt={sira.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">
            Analizando en segundo plano
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900 mb-2">
            Sira está investigando a {competitorName}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Esto toma 30–90 segundos. Puedes quedarte esperando aquí o ir a otra sección — los datos aparecen solos cuando termine.
          </p>
          <ul className="space-y-2">
            {STAGES.map((s, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-sm text-slate-600"
              >
                <span
                  className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Icon name="info" className="text-[14px]" />
            No cierres el navegador para seguir viendo el progreso en tiempo real.
          </div>
        </div>
      </div>
    </Card>
  );
}
