import { prisma, Prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';

export interface JobLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export class JobLogger {
  constructor(private jobId: string) {}

  async log(message: string, level: JobLogEntry['level'] = 'info') {
    const entry: JobLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    logger.debug({ jobId: this.jobId, ...entry }, 'appending job log');

    try {
      // Fetch current job metadata
      const job = await prisma.aiJob.findUnique({
        where: { id: this.jobId },
        select: { metadata: true },
      });

      if (!job) return;

      const metadata = (job.metadata as any) || {};
      const logs = metadata.logs || [];
      logs.push(entry);

      // Keep only last 100 logs to avoid bloating DB
      const trimmedLogs = logs.slice(-100);

      await prisma.aiJob.update({
        where: { id: this.jobId },
        data: {
          metadata: {
            ...metadata,
            logs: trimmedLogs,
          },
        },
      });
    } catch (err) {
      logger.error({ err, jobId: this.jobId }, 'failed to append job log');
    }
  }

  async info(message: string) { return this.log(message, 'info'); }
  async warn(message: string) { return this.log(message, 'warn'); }
  async error(message: string) { return this.log(message, 'error'); }
  async success(message: string) { return this.log(message, 'success'); }
}
