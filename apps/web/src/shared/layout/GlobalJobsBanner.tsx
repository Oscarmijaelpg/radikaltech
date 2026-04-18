import { useProject } from '@/providers/ProjectProvider';
import { useActiveJobs } from '@/features/memory/api/memory/jobs';
import { Icon } from '@radikal/ui';

const JOB_LABELS: Record<string, { label: string; icon: string }> = {
  website_analyze: { label: 'Analizando sitio web', icon: 'language' },
  brand_analyze: { label: 'Análisis completo de marca', icon: 'auto_awesome' },
  brand_synthesize: { label: 'Sintetizando identidad', icon: 'psychology' },
  image_analyze: { label: 'Analizando imágenes', icon: 'image_search' },
  instagram_scrape: { label: 'Descargando Instagram', icon: 'photo_camera' },
  tiktok_scrape: { label: 'Descargando TikTok', icon: 'music_note' },
  auto_competitor_detect: { label: 'Detectando competidores', icon: 'radar' },
  competitor_analyze: { label: 'Analizando competidor', icon: 'query_stats' },
  news_aggregate: { label: 'Buscando noticias', icon: 'newspaper' },
  recommendations_generate: { label: 'Generando recomendaciones', icon: 'lightbulb' },
  image_generate: { label: 'Generando imagen', icon: 'brush' },
};

export function GlobalJobsBanner() {
  const { activeProject } = useProject();
  const { data: jobs = [] } = useActiveJobs(activeProject?.id);

  if (jobs.length === 0) return null;

  const first = jobs[0]!;
  const meta = JOB_LABELS[first.kind] ?? { label: first.kind, icon: 'bolt' };

  return (
    <div className="bg-gradient-to-r from-[hsl(var(--color-primary)/0.08)] via-[hsl(var(--color-primary)/0.04)] to-transparent border-b border-[hsl(var(--color-primary)/0.15)] px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top fade-in duration-300">
      <Icon name="progress_activity" className="text-[18px] text-[hsl(var(--color-primary))] animate-spin" />
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
          {jobs.length === 1
            ? meta.label
            : `${jobs.length} tareas en curso`}
        </span>
        {jobs.length > 1 && (
          <div className="flex gap-1.5">
            {jobs.slice(0, 4).map((j) => {
              const m = JOB_LABELS[j.kind] ?? { icon: 'bolt' };
              return (
                <span
                  key={j.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 text-[10px] font-semibold text-slate-600 border border-slate-200 whitespace-nowrap"
                >
                  <Icon name={m.icon} className="text-[12px] text-[hsl(var(--color-primary))]" />
                  {(JOB_LABELS[j.kind]?.label ?? j.kind).split(' ').slice(0, 2).join(' ')}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap hidden sm:block">
        Procesando...
      </span>
    </div>
  );
}
