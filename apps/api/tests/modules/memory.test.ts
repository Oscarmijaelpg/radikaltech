import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const memoryFindUnique = vi.fn();
const memoryFindMany = vi.fn();
const memoryCreate = vi.fn();
const memoryUpdate = vi.fn();
const memoryDelete = vi.fn();
const brandProfileFindUnique = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    memory: {
      findUnique: memoryFindUnique,
      findMany: memoryFindMany,
      create: memoryCreate,
      update: memoryUpdate,
      delete: memoryDelete,
    },
    brandProfile: { findUnique: brandProfileFindUnique },
  },
  Prisma: {},
}));

describe('memoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list filters by category', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    memoryFindMany.mockResolvedValue([{ id: 'm1', category: 'brand' }]);
    const { memoryService } = await import('../../src/modules/memory/service.js');
    await memoryService.list('u1', 'p1', 'brand');
    const call = memoryFindMany.mock.calls[0]?.[0] as { where: { category?: string } };
    expect(call.where.category).toBe('brand');
  });

  it('list without category returns all memories of project', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    memoryFindMany.mockResolvedValue([]);
    const { memoryService } = await import('../../src/modules/memory/service.js');
    await memoryService.list('u1', 'p1');
    const call = memoryFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(call.where.category).toBeUndefined();
  });

  it('create throws Forbidden for non-owner', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'other' });
    const { memoryService } = await import('../../src/modules/memory/service.js');
    await expect(
      memoryService.create('u1', { project_id: 'p1', category: 'brand', value: 'v' }),
    ).rejects.toThrow();
  });

  it('create passes projectId, userId, category, value', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    memoryCreate.mockResolvedValue({ id: 'm1' });
    const { memoryService } = await import('../../src/modules/memory/service.js');
    await memoryService.create('u1', { project_id: 'p1', category: 'brand', value: 'v' });
    const call = memoryCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.projectId).toBe('p1');
    expect(call.data.userId).toBe('u1');
    expect(call.data.value).toBe('v');
  });

  it('update modifies only provided fields', async () => {
    memoryFindUnique.mockResolvedValue({ id: 'm1', userId: 'u1', projectId: null });
    memoryUpdate.mockResolvedValue({ id: 'm1' });
    const { memoryService } = await import('../../src/modules/memory/service.js');
    await memoryService.update('m1', 'u1', { value: 'new' });
    const call = memoryUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.value).toBe('new');
    expect(call.data.category).toBeUndefined();
  });

  it('remove deletes memory owned by user', async () => {
    memoryFindUnique.mockResolvedValue({ id: 'm1', userId: 'u1', projectId: null });
    const { memoryService } = await import('../../src/modules/memory/service.js');
    const res = await memoryService.remove('m1', 'u1');
    expect(memoryDelete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    expect(res.deleted).toBe(true);
  });

  it('getBrand returns brand profile for project', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    brandProfileFindUnique.mockResolvedValue({ id: 'bp1' });
    const { memoryService } = await import('../../src/modules/memory/service.js');
    const bp = await memoryService.getBrand('p1', 'u1');
    expect(bp?.id).toBe('bp1');
  });
});
