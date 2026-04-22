import { useEffect, useState } from 'react';
import { useProject } from '@/providers/ProjectProvider';
import { api } from '@/lib/api';
import { Icon, Button, Spinner, Card } from '@radikal/ui';
import { cn } from '@/shared/utils/cn';

interface JobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface AiJob {
  id: string;
  kind: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  createdAt: string;
  metadata?: {
    logs?: JobLog[];
  };
  error?: string;
}

export function SiraAnalysisPage() {
  const { activeProject } = useProject();
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchJobs = async () => {
    if (!activeProject) return;
    try {
      const res = await api.get<any>(`/jobs/recent?project_id=${activeProject.id}&limit=5`);
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    if (autoRefresh) {
      const interval = setInterval(fetchJobs, 3000);
      return () => clearInterval(interval);
    }
  }, [activeProject, autoRefresh]);

  if (!activeProject) {
    return (
      <div className="p-8 text-center">
        <Icon name="workspaces" className="text-4xl text-slate-300 mb-4" />
        <h1 className="text-xl font-bold">Selecciona un proyecto para ver a Sira en acción</h1>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-2">
            <span className="text-[hsl(var(--color-primary))]">Analiza</span> Sira
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitorea los procesos de IA, scraping y análisis en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(autoRefresh && "border-green-500 text-green-600 bg-green-50")}
            >
                {autoRefresh ? 'Auto-refrescar ON' : 'Auto-refrescar OFF'}
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchJobs}>
                <Icon name="refresh" className={cn("mr-2", loading && "animate-spin")} />
                Actualizar
            </Button>
        </div>
      </header>

      <div className="space-y-6">
        {jobs.length === 0 && !loading && (
            <Card className="p-12 text-center border-dashed">
                <p className="text-slate-400">No hay procesos recientes para este proyecto.</p>
            </Card>
        )}

        {jobs.map((job) => (
          <Card key={job.id} className="overflow-hidden border-slate-200">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-xl grid place-items-center text-white",
                    job.status === 'running' ? "bg-blue-500 animate-pulse" :
                    job.status === 'succeeded' ? "bg-green-500" :
                    job.status === 'failed' ? "bg-red-500" : "bg-slate-400"
                )}>
                    <Icon name={
                        job.kind === 'website_analyze' ? 'public' :
                        job.kind === 'brand_analyze' ? 'auto_awesome' :
                        job.kind === 'instagram_scrape' ? 'camera_alt' : 'memory'
                    } />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-slate-900 uppercase">
                        {job.kind.replace('_', ' ')}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">ID: {job.id}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    job.status === 'running' ? "bg-blue-100 text-blue-700" :
                    job.status === 'succeeded' ? "bg-green-100 text-green-700" :
                    job.status === 'failed' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                )}>
                    {job.status}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(job.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-900 text-slate-300 font-mono text-[12px] min-h-[100px] max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                {job.metadata?.logs?.map((log, i) => (
                    <div key={i} className="flex gap-2 leading-relaxed">
                        <span className="text-slate-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                        <span className={cn(
                            "shrink-0 font-bold",
                            log.level === 'info' ? "text-blue-400" :
                            log.level === 'success' ? "text-green-400" :
                            log.level === 'warn' ? "text-yellow-400" : "text-red-400"
                        )}>{log.level.toUpperCase()}:</span>
                        <span className="break-words">{log.message}</span>
                    </div>
                ))}
                {job.status === 'running' && (
                    <div className="flex gap-2 items-center text-blue-400 italic">
                        <Spinner size="xs" />
                        <span>Procesando...</span>
                    </div>
                )}
                {!job.metadata?.logs?.length && job.status !== 'running' && (
                    <p className="text-slate-600 italic">Sin registros detallados para este proceso.</p>
                )}
                {job.error && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-red-400">
                        <span className="font-bold">ERROR FATAL:</span> {job.error}
                    </div>
                )}
            </div>

            {job.status === 'succeeded' && (job as any).output?.summary && (
              <div className="px-5 py-3 bg-white border-t border-slate-100 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-1.5">
                  <Icon name="description" className="text-slate-400 text-sm" />
                  <span className="text-[11px] font-medium text-slate-600">
                    { (job as any).output.summary.pagesScraped } páginas
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="image" className="text-slate-400 text-sm" />
                  <span className="text-[11px] font-medium text-slate-600">
                    { (job as any).output.summary.imagesAnalyzed } imágenes
                  </span>
                </div>
                { (job as any).output.summary.providers?.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Icon name="dns" className="text-slate-400 text-sm" />
                    <span className="text-[11px] font-medium text-slate-600">
                      Vía: { (job as any).output.summary.providers.join(', ') }
                    </span>
                  </div>
                )}
                <div className="ml-auto text-[10px] text-slate-400 italic">
                  Análisis completado
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
