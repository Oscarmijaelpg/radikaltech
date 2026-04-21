import { Badge } from '@radikal/ui';
import type { JobStatus } from '../api/jobs';

const MAP: Record<JobStatus, { variant: 'primary' | 'success' | 'warning' | 'destructive' | 'muted'; label: string }> = {
  queued: { variant: 'muted', label: 'En cola' },
  running: { variant: 'primary', label: 'Corriendo' },
  succeeded: { variant: 'success', label: 'Completado' },
  failed: { variant: 'destructive', label: 'Fallido' },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const m = MAP[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
