import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const socialAccountFindUnique = vi.fn();
const socialAccountFindMany = vi.fn();
const socialAccountCreate = vi.fn();
const socialAccountUpdate = vi.fn();
const socialAccountDelete = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    socialAccount: {
      findUnique: socialAccountFindUnique,
      findMany: socialAccountFindMany,
      create: socialAccountCreate,
      update: socialAccountUpdate,
      delete: socialAccountDelete,
    },
  },
}));

vi.mock('../../src/modules/ai-services/index.js', () => ({
  instagramScraper: { scrape: vi.fn(async () => ({ posts: [] })) },
  tiktokScraper: { scrape: vi.fn(async () => ({ posts: [] })) },
  parseInstagramHandle: vi.fn(() => null),
  parseTikTokHandle: vi.fn(() => null),
}));

function makeProject(userId = 'u1') {
  return { id: 'p1', userId };
}

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    projectId: 'p1',
    userId: 'u1',
    platform: 'instagram',
    source: 'url',
    url: 'https://instagram.com/acme',
    handle: 'acme',
    manualDescription: null,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('socialAccountsService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listByProject', () => {
    it('returns accounts for project owner', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      socialAccountFindMany.mockResolvedValue([makeAccount()]);
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      const items = await socialAccountsService.listByProject('p1', 'u1');
      expect(items).toHaveLength(1);
    });

    it('throws for non-owner', async () => {
      projectFindUnique.mockResolvedValue(makeProject('other'));
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      await expect(socialAccountsService.listByProject('p1', 'u1')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('stores account with url source', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      socialAccountCreate.mockResolvedValue(makeAccount());
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      await socialAccountsService.create('u1', {
        project_id: 'p1',
        platform: 'instagram',
        source: 'url',
        url: 'https://instagram.com/acme',
        handle: 'acme',
      });
      const call = socialAccountCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.platform).toBe('instagram');
      expect(call.data.source).toBe('url');
    });

    it('throws BadRequest when source=url but no url', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      await expect(
        socialAccountsService.create('u1', { project_id: 'p1', platform: 'instagram', source: 'url' }),
      ).rejects.toThrow();
    });

    it('throws BadRequest when source=manual but no manual_description', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      await expect(
        socialAccountsService.create('u1', { project_id: 'p1', platform: 'instagram', source: 'manual' }),
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      socialAccountFindUnique.mockResolvedValue(makeAccount());
      projectFindUnique.mockResolvedValue(makeProject());
      socialAccountUpdate.mockResolvedValue(makeAccount({ handle: 'newhandle' }));
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      await socialAccountsService.update('a1', 'u1', { handle: 'newhandle' });
      const call = socialAccountUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(call.data.handle).toBe('newhandle');
      expect(call.data.platform).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('deletes account and returns { deleted: true }', async () => {
      socialAccountFindUnique.mockResolvedValue(makeAccount());
      projectFindUnique.mockResolvedValue(makeProject());
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      const res = await socialAccountsService.remove('a1', 'u1');
      expect(socialAccountDelete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(res.deleted).toBe(true);
    });
  });

  describe('syncProject', () => {
    it('returns { scheduled: 0 } when no active accounts', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      socialAccountFindMany.mockResolvedValue([]);
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      const r = await socialAccountsService.syncProject('p1', 'u1');
      expect(r.scheduled).toBe(0);
    });

    it('schedules scrapes for active accounts with handles', async () => {
      projectFindUnique.mockResolvedValue(makeProject());
      socialAccountFindMany.mockResolvedValue([
        makeAccount({ platform: 'instagram', handle: 'acme', isActive: true }),
        makeAccount({ id: 'a2', platform: 'tiktok', handle: 'acmetk', isActive: true }),
      ]);
      const { socialAccountsService } = await import('../../src/modules/social-accounts/service.js');
      const r = await socialAccountsService.syncProject('p1', 'u1');
      expect(r.scheduled).toBe(2);
    });
  });
});
