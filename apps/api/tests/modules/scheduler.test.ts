import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const postFindUnique = vi.fn();
const postFindMany = vi.fn();
const postCreate = vi.fn();
const postUpdate = vi.fn();
const postDelete = vi.fn();
const contentAssetFindUnique = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    scheduledPost: {
      findUnique: postFindUnique,
      findMany: postFindMany,
      create: postCreate,
      update: postUpdate,
      delete: postDelete,
    },
    contentAsset: { findUnique: contentAssetFindUnique },
  },
  Prisma: {},
}));

function makeProject(userId = 'u1') {
  return { id: 'p1', userId };
}

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sp1',
    projectId: 'p1',
    userId: 'u1',
    platforms: ['instagram'],
    caption: 'Hello',
    hashtags: [],
    scheduledAt: new Date('2025-06-01T10:00:00Z'),
    status: 'scheduled',
    publishedAt: null,
    externalIds: {},
    notes: null,
    assetId: null,
    ...overrides,
  };
}

describe('schedulerService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('list', () => {
    it('returns posts for project owner', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      postFindMany.mockResolvedValue([makePost()]);
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      const items = await schedulerService.list('u1', 'p1');
      expect(items).toHaveLength(1);
    });

    it('filters by status', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      postFindMany.mockResolvedValue([]);
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      await schedulerService.list('u1', 'p1', { status: 'published' as never });
      const call = postFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
      expect(call.where.status).toBe('published');
    });

    it('applies date range filters', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      postFindMany.mockResolvedValue([]);
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      await schedulerService.list('u1', 'p1', { from, to });
      const call = postFindMany.mock.calls[0]?.[0] as {
        where: { scheduledAt: { gte: Date; lte: Date } };
      };
      expect(call.where.scheduledAt.gte).toEqual(from);
      expect(call.where.scheduledAt.lte).toEqual(to);
    });
  });

  describe('getById', () => {
    it('returns post for owner', async () => {
      postFindUnique.mockResolvedValue(makePost());
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      const p = await schedulerService.getById('sp1', 'u1');
      expect(p.id).toBe('sp1');
    });

    it('throws NotFound for missing post', async () => {
      postFindUnique.mockResolvedValue(null);
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      await expect(schedulerService.getById('nope', 'u1')).rejects.toThrow();
    });

    it('throws Forbidden when user mismatches', async () => {
      postFindUnique.mockResolvedValue(makePost({ userId: 'other' }));
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      await expect(schedulerService.getById('sp1', 'u1')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('creates post with all fields', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      postCreate.mockResolvedValue(makePost());
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      await schedulerService.create({
        userId: 'u1',
        projectId: 'p1',
        platforms: ['instagram' as never],
        scheduledAt: new Date('2025-06-01'),
        caption: 'Hello',
        hashtags: ['brand'],
      });
      const call = postCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.caption).toBe('Hello');
      expect(call.data.hashtags).toEqual(['brand']);
    });

    it('throws Forbidden when assetId does not belong to user', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      contentAssetFindUnique.mockResolvedValue({ id: 'asset1', userId: 'other' });
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      await expect(
        schedulerService.create({
          userId: 'u1',
          projectId: 'p1',
          platforms: ['instagram' as never],
          scheduledAt: new Date(),
          assetId: 'asset1',
        }),
      ).rejects.toThrow();
    });
  });

  describe('cancel', () => {
    it('sets status to cancelled', async () => {
      postFindUnique.mockResolvedValue(makePost());
      postUpdate.mockResolvedValue(makePost({ status: 'cancelled' }));
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      await schedulerService.cancel('sp1', 'u1');
      const call = postUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.status).toBe('cancelled');
    });
  });

  describe('markPublished', () => {
    it('sets status published and publishedAt', async () => {
      postFindUnique.mockResolvedValue(makePost());
      postUpdate.mockResolvedValue(makePost({ status: 'published' }));
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      await schedulerService.markPublished('sp1', 'u1', { post_id: '123' });
      const call = postUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.status).toBe('published');
      expect(call.data.publishedAt).toBeInstanceOf(Date);
      expect(call.data.externalIds).toEqual({ post_id: '123' });
    });
  });

  describe('remove', () => {
    it('deletes post for owner', async () => {
      postFindUnique.mockResolvedValue(makePost());
      const { schedulerService } = await import('../../src/modules/scheduler/service.js');
      const res = await schedulerService.remove('sp1', 'u1');
      expect(postDelete).toHaveBeenCalledWith({ where: { id: 'sp1' } });
      expect(res.deleted).toBe(true);
    });
  });
});
