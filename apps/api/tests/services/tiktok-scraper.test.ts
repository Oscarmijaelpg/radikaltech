import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    APIFY_API_KEY: 'ap-test',
    LOG_LEVEL: 'silent',
  },
}));

const aiJobCreate = vi.fn(async () => ({ id: 'job-1' }));
const aiJobUpdate = vi.fn(async () => ({}));
const socialPostUpsert = vi.fn(async () => ({ id: 'sp1' }));
const socialPostFindMany = vi.fn(async () => []);
const socialPostUpdate = vi.fn(async () => ({}));

vi.mock('@radikal/db', () => ({
  prisma: {
    aiJob: { create: aiJobCreate, update: aiJobUpdate },
    socialPost: {
      upsert: socialPostUpsert,
      findMany: socialPostFindMany,
      update: socialPostUpdate,
    },
  },
  Prisma: {},
}));

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ data: {}, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://storage/x.jpg' } })),
      }),
    },
  },
}));

vi.mock('../../src/modules/ai-services/image-analyzer.js', () => ({
  imageAnalyzer: { analyze: vi.fn(async () => null) },
  ImageAnalyzer: class {
    async analyze() {
      return null;
    }
  },
}));

describe('TikTokScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns posts (no competitorId → no socialPost upsert)', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: 'tt1',
            webVideoUrl: 'https://tiktok.com/@u/video/1',
            text: 'hi',
            diggCount: 5,
            commentCount: 1,
            shareCount: 0,
            playCount: 100,
            createTimeISO: '2025-01-01T00:00:00Z',
          },
        ]),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { TikTokScraper } = await import('../../src/modules/ai-services/tiktok-scraper.js');
    const s = new TikTokScraper();
    const res = await s.scrape({ handle: 'foo', userId: 'u1', projectId: 'p1' });
    expect(res.posts.length).toBe(1);
    expect(res.posts[0]?.views).toBe(100);
    expect(socialPostUpsert).not.toHaveBeenCalled();
  });

  it('upserts SocialPost when competitorId present', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: 'tt1',
            webVideoUrl: 'https://tiktok.com/@u/video/1',
            text: 'hi',
            diggCount: 5,
            commentCount: 1,
            shareCount: 0,
            playCount: 100,
          },
        ]),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { TikTokScraper } = await import('../../src/modules/ai-services/tiktok-scraper.js');
    const s = new TikTokScraper();
    const res = await s.scrape({
      handle: 'foo',
      userId: 'u1',
      projectId: 'p1',
      competitorId: 'c1',
    });
    expect(res.posts.length).toBe(1);
    expect(socialPostUpsert).toHaveBeenCalled();
  });

  it('parseTikTokHandle handles various inputs', async () => {
    const { parseTikTokHandle } = await import('../../src/modules/ai-services/tiktok-scraper.js');
    expect(parseTikTokHandle('@foo')).toBe('foo');
    expect(parseTikTokHandle('https://tiktok.com/@bar')).toBe('bar');
    expect(parseTikTokHandle('')).toBeNull();
  });

  it('throws on Apify non-OK response', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    const { TikTokScraper } = await import('../../src/modules/ai-services/tiktok-scraper.js');
    const s = new TikTokScraper();
    await expect(s.scrape({ handle: 'foo', userId: 'u1', projectId: 'p1' })).rejects.toThrow();
  });
});
