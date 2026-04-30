import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const aiJobFindUnique = vi.fn();
const aiJobFindMany = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    aiJob: { findUnique: aiJobFindUnique, findMany: aiJobFindMany },
  },
}));

const now = new Date('2024-01-15T10:00:00Z');

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'j1',
    kind: 'brand_analyze',
    status: 'running',
    userId: 'u1',
    projectId: 'p1',
    metadata: null,
    error: null,
    output: null,
    createdAt: now,
    startedAt: now,
    finishedAt: null,
    ...overrides,
  };
}

describe('jobsService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getById', () => {
    it('returns job for owner', async () => {
      aiJobFindUnique.mockResolvedValue(makeJob());
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      const j = await jobsService.getById('j1', 'u1');
      expect(j.id).toBe('j1');
    });

    it('throws NotFound for missing job', async () => {
      aiJobFindUnique.mockResolvedValue(null);
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      await expect(jobsService.getById('missing', 'u1')).rejects.toThrow();
    });

    it('throws Forbidden when userId mismatches', async () => {
      aiJobFindUnique.mockResolvedValue(makeJob({ userId: 'other' }));
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      await expect(jobsService.getById('j1', 'u1')).rejects.toThrow();
    });

    it('allows access when job has no userId', async () => {
      aiJobFindUnique.mockResolvedValue(makeJob({ userId: null }));
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      const j = await jobsService.getById('j1', 'anyone');
      expect(j.id).toBe('j1');
    });
  });

  describe('listActive', () => {
    it('queries only queued/running statuses', async () => {
      aiJobFindMany.mockResolvedValue([makeJob()]);
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      await jobsService.listActive('u1');
      const call = aiJobFindMany.mock.calls[0]?.[0] as { where: { status: { in: string[] } } };
      expect(call.where.status.in).toEqual(['queued', 'running']);
    });

    it('maps dates to ISO strings', async () => {
      aiJobFindMany.mockResolvedValue([makeJob()]);
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      const [job] = await jobsService.listActive('u1');
      expect(job!.created_at).toBe(now.toISOString());
      expect(job!.started_at).toBe(now.toISOString());
    });

    it('filters by projectId when provided', async () => {
      aiJobFindMany.mockResolvedValue([]);
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      await jobsService.listActive('u1', 'p1');
      const call = aiJobFindMany.mock.calls[0]?.[0] as { where: { projectId?: string } };
      expect(call.where.projectId).toBe('p1');
    });

    it('started_at is null when job has no startedAt', async () => {
      aiJobFindMany.mockResolvedValue([makeJob({ startedAt: null })]);
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      const [job] = await jobsService.listActive('u1');
      expect(job!.started_at).toBeNull();
    });
  });

  describe('listRecent', () => {
    it('respects limit parameter', async () => {
      aiJobFindMany.mockResolvedValue([]);
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      await jobsService.listRecent('u1', undefined, 5);
      const call = aiJobFindMany.mock.calls[0]?.[0] as { take: number };
      expect(call.take).toBe(5);
    });

    it('includes error and output fields', async () => {
      aiJobFindMany.mockResolvedValue([makeJob({ error: 'timeout', output: { result: 1 } })]);
      const { jobsService } = await import('../../src/modules/jobs/service.js');
      const [job] = await jobsService.listRecent('u1');
      expect(job!.error).toBe('timeout');
      expect(job!.output).toEqual({ result: 1 });
    });
  });
});
