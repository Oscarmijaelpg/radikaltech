import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const srFindUnique = vi.fn();
const srFindMany = vi.fn();
const srCreate = vi.fn();
const srUpdate = vi.fn();
const srDelete = vi.fn();
const srFindUniqueOrThrow = vi.fn();
const notificationCreate = vi.fn();
const transactionFn = vi.fn(async (ops: unknown[]) => Promise.all((ops as Promise<unknown>[])));

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    scheduledReport: {
      findUnique: srFindUnique,
      findMany: srFindMany,
      create: srCreate,
      update: srUpdate,
      delete: srDelete,
      findUniqueOrThrow: srFindUniqueOrThrow,
    },
    notification: { create: notificationCreate },
    $transaction: transactionFn,
  },
}));

vi.mock('../../src/modules/reports/generators/index.js', () => ({
  generateBrandStrategy: vi.fn(async () => ({ id: 'rpt-1', title: 'Brand Strategy' })),
  generateMonthlyAudit: vi.fn(async () => ({ id: 'rpt-2', title: 'Monthly Audit' })),
  generateCompetitionReport: vi.fn(async () => ({ id: 'rpt-3', title: 'Competition Report' })),
}));

function makeSR(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sr1',
    userId: 'u1',
    projectId: 'p1',
    kind: 'brand_monthly',
    frequency: 'monthly',
    title: 'Monthly Report',
    enabled: true,
    config: {},
    nextRunAt: new Date('2025-02-01'),
    lastRunAt: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('computeNextRun', () => {
  it('advances by 1 day for daily', async () => {
    const { computeNextRun } = await import('../../src/modules/scheduled-reports/service.js');
    const from = new Date('2025-01-15T12:00:00');
    const next = computeNextRun('daily', from);
    expect(next.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('advances by 7 days for weekly', async () => {
    const { computeNextRun } = await import('../../src/modules/scheduled-reports/service.js');
    const from = new Date('2025-01-01T12:00:00');
    const next = computeNextRun('weekly', from);
    expect(next.getTime() - from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('advances by 1 month for monthly', async () => {
    const { computeNextRun } = await import('../../src/modules/scheduled-reports/service.js');
    const from = new Date('2025-01-15T12:00:00');
    const next = computeNextRun('monthly', from);
    expect(next.getMonth()).toBe(from.getMonth() + 1);
  });
});

describe('scheduledReportsService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('list', () => {
    it('returns reports for project owner', async () => {
      projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
      srFindMany.mockResolvedValue([makeSR()]);
      const { scheduledReportsService } = await import('../../src/modules/scheduled-reports/service.js');
      const items = await scheduledReportsService.list('u1', 'p1');
      expect(items).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('sets nextRunAt based on frequency', async () => {
      projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
      srCreate.mockResolvedValue(makeSR());
      const { scheduledReportsService } = await import('../../src/modules/scheduled-reports/service.js');
      await scheduledReportsService.create({
        userId: 'u1',
        projectId: 'p1',
        kind: 'brand_monthly' as never,
        frequency: 'weekly' as never,
        title: 'Weekly Report',
      });
      const call = srCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.nextRunAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('updates frequency and recalculates nextRunAt', async () => {
      srFindUnique.mockResolvedValue(makeSR());
      srUpdate.mockResolvedValue(makeSR({ frequency: 'weekly' }));
      const { scheduledReportsService } = await import('../../src/modules/scheduled-reports/service.js');
      await scheduledReportsService.update('sr1', 'u1', { frequency: 'weekly' as never });
      const call = srUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.frequency).toBe('weekly');
      expect(call.data.nextRunAt).toBeInstanceOf(Date);
    });

    it('updates enabled flag', async () => {
      srFindUnique.mockResolvedValue(makeSR());
      srUpdate.mockResolvedValue(makeSR({ enabled: false }));
      const { scheduledReportsService } = await import('../../src/modules/scheduled-reports/service.js');
      await scheduledReportsService.update('sr1', 'u1', { enabled: false });
      const call = srUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.enabled).toBe(false);
    });

    it('throws Forbidden for wrong user', async () => {
      srFindUnique.mockResolvedValue(makeSR({ userId: 'other' }));
      const { scheduledReportsService } = await import('../../src/modules/scheduled-reports/service.js');
      await expect(scheduledReportsService.update('sr1', 'u1', {})).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('deletes report for owner', async () => {
      srFindUnique.mockResolvedValue(makeSR());
      const { scheduledReportsService } = await import('../../src/modules/scheduled-reports/service.js');
      await scheduledReportsService.remove('sr1', 'u1');
      expect(srDelete).toHaveBeenCalledWith({ where: { id: 'sr1' } });
    });
  });

  describe('runNow', () => {
    it('executes report and returns updated record', async () => {
      srFindUnique.mockResolvedValue(makeSR());
      srFindUniqueOrThrow.mockResolvedValue(makeSR({ lastRunAt: new Date() }));
      const { scheduledReportsService } = await import('../../src/modules/scheduled-reports/service.js');
      const result = await scheduledReportsService.runNow('sr1', 'u1');
      expect(result.id).toBe('sr1');
      expect(transactionFn).toHaveBeenCalled();
    });
  });
});
