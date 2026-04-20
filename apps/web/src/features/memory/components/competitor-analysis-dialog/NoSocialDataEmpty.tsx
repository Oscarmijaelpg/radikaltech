import { Icon } from '@radikal/ui';

interface Props {
  competitorName: string;
}

export function NoSocialDataEmpty({ competitorName }: Props) {
  return (
    <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-center">
      <Icon name="query_stats" className="text-[40px] text-slate-400 mb-3 block" />
      <h4 className="font-display text-lg font-bold text-slate-900 mb-1">
        Aún no hay datos sociales de {competitorName}
      </h4>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
        Para ver gráficos, posts y estética necesitamos scrapear su Instagram o TikTok.
        Intenta:
      </p>
      <ul className="text-sm text-left text-slate-600 max-w-md mx-auto space-y-1.5 list-disc pl-5">
        <li>Edita el competidor y añade el URL de su Instagram o TikTok manualmente.</li>
        <li>
          O ejecuta el análisis de nuevo — intentaremos descubrir sus redes automáticamente
          desde su sitio web.
        </li>
      </ul>
    </div>
  );
}
