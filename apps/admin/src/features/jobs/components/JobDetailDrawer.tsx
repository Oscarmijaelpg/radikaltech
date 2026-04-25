import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
  Spinner,
} from '@radikal/ui';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminJob, useRetryJob } from '../api/jobs';
import { JobStatusBadge } from './JobStatusBadge';

interface Props {
  jobId: string | null;
  onClose: () => void;
}

export function JobDetailDrawer({ jobId, onClose }: Props) {
  const { data: job, isLoading } = useAdminJob(jobId);
  const retry = useRetryJob();

  return (
    <Dialog open={!!jobId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        {isLoading || !job ? (
          <div className="py-12 grid place-items-center"><Spinner /></div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-3">
                <DialogTitle>{job.kind}</DialogTitle>
                <JobStatusBadge status={job.status} />
              </div>
              <DialogDescription>
                {job.user.email} · {format(new Date(job.createdAt), 'dd MMM yyyy HH:mm:ss')}
              </DialogDescription>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Info
                label="ID tarea"
                value={<code className="text-xs break-all">{job.id}</code>}
              />
              <Info label="Usuario" value={<code className="text-xs break-all">{job.userId}</code>} />
              <Info
                label="Proyecto"
                value={
                  job.projectId ? (
                    <code className="text-xs break-all">{job.projectId}</code>
                  ) : (
                    '—'
                  )
                }
              />
              <Info
                label="Inicio"
                value={job.startedAt ? format(new Date(job.startedAt), 'HH:mm:ss') : '—'}
              />
              <Info
                label="Fin"
                value={job.finishedAt ? format(new Date(job.finishedAt), 'HH:mm:ss') : '—'}
              />
            </div>

            {job.error && (
              <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm">
                <div className="text-xs uppercase tracking-wider text-red-700 mb-1">Error</div>
                <pre className="text-red-900 text-xs whitespace-pre-wrap">{job.error}</pre>
              </div>
            )}

            <JsonBlock label="Entrada" value={job.input} />
            <JsonBlock label="Salida" value={job.output} />

            {(job.status === 'failed' || job.status === 'succeeded') && (
              <div className="pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => retry.mutate(job.id)}
                  disabled={retry.isPending}
                >
                  <RefreshCw size={16} className="mr-2" />
                  {retry.isPending ? 'Re-encolando…' : 'Reintentar tarea'}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-1">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <pre className="text-xs whitespace-pre-wrap max-h-72 overflow-y-auto custom-scrollbar">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
