import { prisma } from '@radikal/db';
import { Forbidden, NotFound } from '../../lib/errors.js';

export const jobsService = {
  async getById(id: string, userId: string) {
    const job = await prisma.aiJob.findUnique({ where: { id } });
    if (!job) throw new NotFound('Job not found');
    if (job.userId && job.userId !== userId) throw new Forbidden();
    return job;
  },

  async listActive(userId: string, projectId?: string) {
    const jobs = await prisma.aiJob.findMany({
      where: {
        userId,
        projectId: projectId ?? undefined,
        status: { in: ['queued', 'running'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return jobs.map((j) => ({
      id: j.id,
      kind: j.kind,
      status: j.status,
      project_id: j.projectId,
      created_at: j.createdAt.toISOString(),
      started_at: j.startedAt?.toISOString() ?? null,
    }));
  },

  async listRecent(userId: string, projectId?: string, limit = 10) {
    const jobs = await prisma.aiJob.findMany({
      where: { userId, projectId: projectId ?? undefined },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return jobs.map((j) => ({
      id: j.id,
      kind: j.kind,
      status: j.status,
      project_id: j.projectId,
      error: j.error,
      created_at: j.createdAt.toISOString(),
      finished_at: j.finishedAt?.toISOString() ?? null,
    }));
  },
};
