import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const recFindUnique = vi.fn();
const recFindMany = vi.fn();
const recUpdate = vi.fn();
const recDelete = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    recommendation: {
      findUnique: recFindUnique,
      findMany: recFindMany,
      update: recUpdate,
      delete: recDelete,
    },
  },
  RecommendationStatus: {},
  RecommendationKind: {},
}));

const baseDate = new Date('2024-01-10T10:00:00Z');

function makeRec(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    userId: 'u1',
    projectId: 'p1',
    impact: 'high',
    status: 'pending',
    kind: 'content',
    generatedAt: baseDate,
    completedAt: null,
    userNotes: null,
    ...overrides,
  };
}

describe('recommendationsService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('list', () => {
    it('sorts by impact then date', async () => {
      projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
      const lowImpact = makeRec({ id: 'r2', impact: 'low', generatedAt: new Date('2024-01-09') });
      const highImpact = makeRec({ id: 'r1', impact: 'high', generatedAt: new Date('2024-01-08') });
      const medImpact = makeRec({ id: 'r3', impact: 'medium', generatedAt: new Date('2024-01-07') });
      recFindMany.mockResolvedValue([lowImpact, highImpact, medImpact]);
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      const items = await recommendationsService.list('u1', 'p1');
      expect(items[0]!.impact).toBe('high');
      expect(items[1]!.impact).toBe('medium');
      expect(items[2]!.impact).toBe('low');
    });

    it('passes status filter to prisma', async () => {
      projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
      recFindMany.mockResolvedValue([]);
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      await recommendationsService.list('u1', 'p1', { status: 'pending' as never });
      const call = recFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
      expect(call.where.status).toBe('pending');
    });

    it('throws Forbidden for non-owner', async () => {
      projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'other' });
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      await expect(recommendationsService.list('u1', 'p1')).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('returns recommendation for owner', async () => {
      recFindUnique.mockResolvedValue(makeRec());
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      const r = await recommendationsService.getById('r1', 'u1');
      expect(r.id).toBe('r1');
    });

    it('throws NotFound for missing', async () => {
      recFindUnique.mockResolvedValue(null);
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      await expect(recommendationsService.getById('nope', 'u1')).rejects.toThrow();
    });

    it('throws Forbidden for wrong user', async () => {
      recFindUnique.mockResolvedValue(makeRec({ userId: 'other' }));
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      await expect(recommendationsService.getById('r1', 'u1')).rejects.toThrow();
    });
  });

  describe('updateStatus', () => {
    it('sets completedAt when status is completed', async () => {
      recFindUnique.mockResolvedValue(makeRec());
      recUpdate.mockResolvedValue(makeRec({ status: 'completed' }));
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      await recommendationsService.updateStatus('r1', 'u1', 'completed' as never);
      const call = recUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.completedAt).toBeInstanceOf(Date);
    });

    it('does not set completedAt for non-completed status', async () => {
      recFindUnique.mockResolvedValue(makeRec());
      recUpdate.mockResolvedValue(makeRec({ status: 'dismissed' }));
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      await recommendationsService.updateStatus('r1', 'u1', 'dismissed' as never);
      const call = recUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.completedAt).toBeUndefined();
    });
  });

  describe('addNote', () => {
    it('stores note in userNotes', async () => {
      recFindUnique.mockResolvedValue(makeRec());
      recUpdate.mockResolvedValue(makeRec({ userNotes: 'Done this' }));
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      await recommendationsService.addNote('r1', 'u1', 'Done this');
      const call = recUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.userNotes).toBe('Done this');
    });
  });

  describe('deleteRecommendation', () => {
    it('deletes record for owner', async () => {
      recFindUnique.mockResolvedValue(makeRec());
      const { recommendationsService } = await import('../../src/modules/recommendations/service.js');
      await recommendationsService.deleteRecommendation('r1', 'u1');
      expect(recDelete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });
  });
});
