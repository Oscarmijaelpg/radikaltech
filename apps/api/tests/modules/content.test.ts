import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const assetFindUnique = vi.fn();
const assetFindMany = vi.fn();
const assetCount = vi.fn();
const assetCreate = vi.fn();
const assetUpdate = vi.fn();
const assetDelete = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    contentAsset: {
      findUnique: assetFindUnique,
      findMany: assetFindMany,
      count: assetCount,
      create: assetCreate,
      update: assetUpdate,
      delete: assetDelete,
    },
  },
  Prisma: {},
}));

describe('contentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list applies type/sort filters and pagination', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    assetFindMany.mockResolvedValue([{ id: 'a1' }]);
    assetCount.mockResolvedValue(1);
    const { contentService } = await import('../../src/modules/content/service.js');
    const res = await contentService.list('u1', 'p1', { type: 'image', sort: 'score', limit: 10 });
    const findCall = assetFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, unknown>;
      take: number;
    };
    expect(findCall.where.assetType).toBe('image');
    expect(findCall.orderBy.aestheticScore).toBe('desc');
    expect(findCall.take).toBe(10);
    expect(res.total).toBe(1);
  });

  it('list throws Forbidden for non-owner project', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'other' });
    const { contentService } = await import('../../src/modules/content/service.js');
    await expect(contentService.list('u1', 'p1')).rejects.toThrow();
  });

  it('getById throws Forbidden for non-owner', async () => {
    assetFindUnique.mockResolvedValue({ id: 'a1', userId: 'other' });
    const { contentService } = await import('../../src/modules/content/service.js');
    await expect(contentService.getById('a1', 'u1')).rejects.toThrow();
  });

  it('getById returns asset for owner', async () => {
    assetFindUnique.mockResolvedValue({ id: 'a1', userId: 'u1' });
    const { contentService } = await import('../../src/modules/content/service.js');
    const a = await contentService.getById('a1', 'u1');
    expect(a.id).toBe('a1');
  });

  it('create asserts project owner and persists asset', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    assetCreate.mockResolvedValue({ id: 'a1' });
    const { contentService } = await import('../../src/modules/content/service.js');
    await contentService.create({
      userId: 'u1',
      projectId: 'p1',
      asset_url: 'https://cdn/x.jpg',
      asset_type: 'image' as never,
    });
    const call = assetCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.assetUrl).toBe('https://cdn/x.jpg');
    expect(call.data.assetType).toBe('image');
  });

  it('remove throws Forbidden for non-owner', async () => {
    assetFindUnique.mockResolvedValue({ id: 'a1', userId: 'other' });
    const { contentService } = await import('../../src/modules/content/service.js');
    await expect(contentService.remove('a1', 'u1')).rejects.toThrow();
  });

  it('remove deletes when owner', async () => {
    assetFindUnique.mockResolvedValue({ id: 'a1', userId: 'u1' });
    const { contentService } = await import('../../src/modules/content/service.js');
    const res = await contentService.remove('a1', 'u1');
    expect(assetDelete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    expect(res.deleted).toBe(true);
  });

  it('update patches tags and ai_description', async () => {
    assetFindUnique.mockResolvedValue({ id: 'a1', userId: 'u1' });
    assetUpdate.mockResolvedValue({ id: 'a1' });
    const { contentService } = await import('../../src/modules/content/service.js');
    await contentService.update('a1', 'u1', { tags: ['t'], ai_description: 'd' });
    const call = assetUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.tags).toEqual(['t']);
    expect(call.data.aiDescription).toBe('d');
  });
});
