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
const contentAssetCreate = vi.fn(async ({ data }: { data: { assetUrl: string } }) => ({
  id: 'asset-' + Math.random().toString(36).slice(2, 6),
  assetUrl: data.assetUrl,
}));
const socialPostUpsert = vi.fn(async () => ({ id: 'sp1' }));
const socialPostFindMany = vi.fn(async () => []);
const socialPostUpdate = vi.fn(async () => ({}));

vi.mock('@radikal/db', () => ({
  prisma: {
    aiJob: { create: aiJobCreate, update: aiJobUpdate },
    contentAsset: { create: contentAssetCreate },
    socialAccount: { updateMany: vi.fn(async () => ({ count: 0 })) },
    socialPost: {
      upsert: socialPostUpsert,
      findMany: socialPostFindMany,
      update: socialPostUpdate,
    },
    notification: { create: vi.fn(async () => ({ id: 'n1' })) },
  },
  Prisma: {},
}));

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ data: {}, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://storage/pub.jpg' } })),
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

describe('InstagramScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates ContentAssets for scraped posts (no competitorId)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('apify.com')) {
        return new Response(
          JSON.stringify([
            {
              username: 'foo',
              followersCount: 100,
              latestPosts: [
                {
                  url: 'https://instagram.com/p/x1/',
                  displayUrl: 'https://cdn.ig/1.jpg',
                  caption: 'nice',
                  likesCount: 10,
                  commentsCount: 2,
                  shortCode: 'x1',
                },
              ],
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(new Uint8Array(128), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { InstagramScraper } = await import('../../src/modules/ai-services/instagram-scraper.js');
    const s = new InstagramScraper();
    const res = await s.scrape({ handle: 'foo', userId: 'u1', projectId: 'p1' });
    expect(res.posts.length).toBe(1);
    expect(contentAssetCreate).toHaveBeenCalled();
    expect(socialPostUpsert).not.toHaveBeenCalled();
  });

  it('also upserts SocialPost when competitorId is present', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('apify.com')) {
        return new Response(
          JSON.stringify([
            {
              username: 'foo',
              followersCount: 200,
              latestPosts: [
                {
                  url: 'https://instagram.com/p/x1/',
                  displayUrl: 'https://cdn.ig/1.jpg',
                  caption: 'nice',
                  likesCount: 10,
                  commentsCount: 2,
                  shortCode: 'x1',
                  id: 'ig1',
                },
              ],
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(new Uint8Array(128), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { InstagramScraper } = await import('../../src/modules/ai-services/instagram-scraper.js');
    const s = new InstagramScraper();
    const res = await s.scrape({
      handle: 'foo',
      userId: 'u1',
      projectId: 'p1',
      competitorId: 'c1',
    });
    expect(res.posts.length).toBe(1);
    expect(socialPostUpsert).toHaveBeenCalled();
  });

  it('parseInstagramHandle extracts username from URL/@', async () => {
    const { parseInstagramHandle } = await import(
      '../../src/modules/ai-services/instagram-scraper.js'
    );
    expect(parseInstagramHandle('@foo')).toBe('foo');
    expect(parseInstagramHandle('https://instagram.com/bar/')).toBe('bar');
    expect(parseInstagramHandle('')).toBeNull();
  });
});

describe('InstagramScraper (no Apify key)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('throws when APIFY_API_KEY is missing', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        NODE_ENV: 'test',
        WEB_URL: 'http://localhost:3000',
        APIFY_API_KEY: undefined,
        LOG_LEVEL: 'silent',
      },
    }));
    vi.doMock('@radikal/db', () => ({
      prisma: {
        aiJob: { create: aiJobCreate, update: aiJobUpdate },
        contentAsset: { create: contentAssetCreate },
        socialAccount: { updateMany: vi.fn(async () => ({ count: 0 })) },
        socialPost: {
          upsert: socialPostUpsert,
          findMany: socialPostFindMany,
          update: socialPostUpdate,
        },
        notification: { create: vi.fn(async () => ({ id: 'n1' })) },
      },
      Prisma: {},
    }));
    vi.doMock('../../src/lib/supabase.js', () => ({
      supabaseAdmin: {
        storage: {
          from: () => ({
            upload: vi.fn(),
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
          }),
        },
      },
    }));
    vi.doMock('../../src/modules/ai-services/image-analyzer.js', () => ({
      imageAnalyzer: { analyze: vi.fn() },
      ImageAnalyzer: class {
        async analyze() {
          return null;
        }
      },
    }));
    const { InstagramScraper } = await import('../../src/modules/ai-services/instagram-scraper.js');
    const s = new InstagramScraper();
    await expect(s.scrape({ handle: 'x', userId: 'u1', projectId: 'p1' })).rejects.toThrow(
      /APIFY/,
    );
  });
});
