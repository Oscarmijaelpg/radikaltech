import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const notificationCreate = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    notification: { create: notificationCreate },
  },
}));

describe('notificationService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create stores all fields', async () => {
    notificationCreate.mockResolvedValue({ id: 'n1' });
    const { notificationService } = await import('../../src/modules/notifications/service.js');
    await notificationService.create({
      userId: 'u1',
      projectId: 'p1',
      kind: 'test',
      title: 'Test',
      body: 'body',
      actionUrl: '/test',
    });
    const call = notificationCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.userId).toBe('u1');
    expect(call.data.projectId).toBe('p1');
    expect(call.data.kind).toBe('test');
    expect(call.data.actionUrl).toBe('/test');
  });

  it('create returns null and does not throw when prisma fails', async () => {
    notificationCreate.mockRejectedValue(new Error('db error'));
    const { notificationService } = await import('../../src/modules/notifications/service.js');
    const result = await notificationService.create({ userId: 'u1', kind: 'k', title: 't' });
    expect(result).toBeNull();
  });

  it('analysisComplete sends analysis_complete kind', async () => {
    notificationCreate.mockResolvedValue({ id: 'n2' });
    const { notificationService } = await import('../../src/modules/notifications/service.js');
    await notificationService.analysisComplete('u1', 'p1', 'Acme');
    const call = notificationCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.kind).toBe('analysis_complete');
    expect(call.data.actionUrl).toBe('/competitors');
    expect(String(call.data.title)).toContain('Acme');
  });

  it('reportReady sends report_ready kind', async () => {
    notificationCreate.mockResolvedValue({ id: 'n3' });
    const { notificationService } = await import('../../src/modules/notifications/service.js');
    await notificationService.reportReady('u1', 'p1', 'Q1 Report', 'r1');
    const call = notificationCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.kind).toBe('report_ready');
    expect(String(call.data.title)).toContain('Q1 Report');
  });

  it('recommendationsGenerated includes count in title', async () => {
    notificationCreate.mockResolvedValue({ id: 'n4' });
    const { notificationService } = await import('../../src/modules/notifications/service.js');
    await notificationService.recommendationsGenerated('u1', 'p1', 5);
    const call = notificationCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(String(call.data.title)).toContain('5');
    expect(call.data.actionUrl).toBe('/recommendations');
  });

  it('jobFailed uses job-specific metadata for known kinds', async () => {
    notificationCreate.mockResolvedValue({ id: 'n5' });
    const { notificationService } = await import('../../src/modules/notifications/service.js');
    await notificationService.jobFailed({ userId: 'u1', jobKind: 'website_analyze' });
    const call = notificationCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.kind).toBe('job_failed');
    expect(String(call.data.actionUrl)).toContain('brand');
  });

  it('jobFailed uses generic fallback for unknown kind', async () => {
    notificationCreate.mockResolvedValue({ id: 'n6' });
    const { notificationService } = await import('../../src/modules/notifications/service.js');
    await notificationService.jobFailed({ userId: 'u1', jobKind: 'unknown_kind' });
    const call = notificationCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.actionUrl).toBeNull();
  });

  it('jobFailed appends truncated error detail to body', async () => {
    notificationCreate.mockResolvedValue({ id: 'n7' });
    const { notificationService } = await import('../../src/modules/notifications/service.js');
    const longError = 'x'.repeat(300);
    await notificationService.jobFailed({ userId: 'u1', jobKind: 'brand_analyze', error: longError });
    const call = notificationCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(String(call.data.body).length).toBeLessThanOrEqual(400);
  });
});
