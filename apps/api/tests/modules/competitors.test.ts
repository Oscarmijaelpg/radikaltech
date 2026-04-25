import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
  },
}));

const competitorFindUnique = vi.fn();
const competitorUpdate = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    competitor: {
      findUnique: competitorFindUnique,
      update: competitorUpdate,
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    project: { findUnique: vi.fn() },
    socialPost: { findMany: vi.fn(async () => []) },
  },
  Prisma: {},
}));

// Stub AI services (imported transitively)
vi.mock('../../src/modules/ai-services/index.js', () => ({
  competitorAnalyzer: { analyze: vi.fn() },
  instagramScraper: { scrape: vi.fn() },
  tiktokScraper: { scrape: vi.fn() },
  parseInstagramHandle: () => null,
  parseTikTokHandle: () => null,
}));

describe('competitorsService setStatus', () => {
  beforeEach(() => {
    competitorFindUnique.mockReset();
    competitorUpdate.mockReset();
  });

  it('changes status to confirmed (approve)', async () => {
    competitorFindUnique.mockResolvedValue({ id: 'c1', userId: 'u1', status: 'suggested' });
    competitorUpdate.mockResolvedValue({ id: 'c1', status: 'confirmed' });

    const { competitorsService } = await import(
      '../../src/modules/competitors/service.js'
    );
    const res = await competitorsService.setStatus('c1', 'u1', 'confirmed');
    expect(competitorUpdate).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'confirmed' },
    });
    expect(res.status).toBe('confirmed');
  });

  it('changes status to rejected', async () => {
    competitorFindUnique.mockResolvedValue({ id: 'c1', userId: 'u1', status: 'suggested' });
    competitorUpdate.mockResolvedValue({ id: 'c1', status: 'rejected' });

    const { competitorsService } = await import(
      '../../src/modules/competitors/service.js'
    );
    const res = await competitorsService.setStatus('c1', 'u1', 'rejected');
    expect(competitorUpdate).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { status: 'rejected' },
    });
    expect(res.status).toBe('rejected');
  });

  it('throws Forbidden when user does not own the competitor', async () => {
    competitorFindUnique.mockResolvedValue({ id: 'c1', userId: 'someone-else', status: 'suggested' });

    const { competitorsService } = await import(
      '../../src/modules/competitors/service.js'
    );
    await expect(competitorsService.setStatus('c1', 'u1', 'confirmed')).rejects.toThrow();
    expect(competitorUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFound when competitor does not exist', async () => {
    competitorFindUnique.mockResolvedValue(null);

    const { competitorsService } = await import(
      '../../src/modules/competitors/service.js'
    );
    await expect(competitorsService.setStatus('missing', 'u1', 'confirmed')).rejects.toThrow();
  });
});
