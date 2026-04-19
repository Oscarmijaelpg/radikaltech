import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    FIRECRAWL_API_KEY: 'fc',
    OPENROUTER_API_KEY: 'or',
    GEMINI_API_KEY: 'g',
    OPENAI_API_KEY: 'oa',
    APIFY_API_KEY: undefined,
    LOG_LEVEL: 'silent',
  },
}));

const aiJobCreate = vi.fn(async () => ({ id: 'job-1' }));
const aiJobUpdate = vi.fn(async () => ({}));
const contentAssetFindFirst = vi.fn(async () => null);
const contentAssetCreate = vi.fn(async ({ data }: { data: { assetUrl: string; metadata: unknown } }) => ({
  id: `asset-${Math.random().toString(36).slice(2, 8)}`,
  assetUrl: data.assetUrl,
  metadata: data.metadata,
  tags: ['moodboard'],
}));
const brandProfileUpsert = vi.fn(async () => ({ id: 'bp-1' }));
const brandProfileFindUnique = vi.fn(async () => null);
const projectUpdate = vi.fn(async () => ({}));

vi.mock('@radikal/db', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(async () => ({
        id: 'p1',
        userId: 'u1',
        websiteUrl: 'https://acme.com',
        companyName: 'Acme',
        industry: 'saas',
        businessSummary: 'We do SaaS',
      })),
      update: projectUpdate,
    },
    aiJob: { create: aiJobCreate, update: aiJobUpdate },
    contentAsset: {
      findFirst: contentAssetFindFirst,
      create: contentAssetCreate,
      update: vi.fn(),
    },
    brandProfile: { upsert: brandProfileUpsert, findUnique: brandProfileFindUnique },
    socialAccount: { findMany: vi.fn(async () => []) },
  },
}));

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ data: {}, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://storage/public.jpg' } })),
      }),
    },
  },
}));

// Stub sub-services
vi.mock('../../src/modules/ai-services/website-analyzer/index.js', () => ({
  WebsiteAnalyzer: class {
    async analyze() {
      return { jobId: 'wa', result: { logo_url: undefined, logo_asset_id: undefined } };
    }
  },
  detectLogoCandidates: () => [],
}));
vi.mock('../../src/modules/ai-services/brand-synthesizer.js', () => ({
  BrandSynthesizer: class {
    async synthesize() {
      return null;
    }
  },
}));
vi.mock('../../src/modules/ai-services/image-analyzer.js', () => ({
  ImageAnalyzer: class {
    // Returns null — simulates vision failure
    async analyze() {
      return null;
    }
  },
}));
vi.mock('../../src/modules/ai-services/instagram-scraper.js', () => ({
  InstagramScraper: class {
    async scrape() {
      return { posts: [] };
    }
  },
  parseInstagramHandle: () => null,
}));
vi.mock('../../src/modules/ai-services/tiktok-scraper.js', () => ({
  TikTokScraper: class {
    async scrape() {
      return { posts: [] };
    }
  },
  parseTikTokHandle: () => null,
}));
vi.mock('../../src/modules/ai-services/market-detector.js', () => ({
  MarketDetector: class {
    async detect() {
      return { countries: [] };
    }
  },
}));

describe('BrandOrchestrator', () => {
  beforeEach(() => {
    aiJobCreate.mockClear();
    aiJobUpdate.mockClear();
    contentAssetCreate.mockClear();
    contentAssetFindFirst.mockClear();
    brandProfileUpsert.mockClear();
  });

  it('persists moodboard asset even when visual_analysis is null', async () => {
    // Firecrawl returns HTML with an image, analyzer returns null → should still store asset
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('firecrawl')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              html: '<img src="https://cdn.acme.com/hero.jpg" />',
              markdown: 'hello world content with enough length to pass the filter '.repeat(5),
              metadata: {},
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (u.startsWith('https://cdn.acme.com')) {
        return new Response(new Uint8Array(2048), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        });
      }
      return new Response('{}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { BrandOrchestrator } = await import(
      '../../src/modules/ai-services/brand-orchestrator.js'
    );
    const orch = new BrandOrchestrator();
    const res = await orch.analyze({ projectId: 'p1', userId: 'u1' });

    // Moodboard asset was created even though analyzer returned null
    expect(contentAssetCreate).toHaveBeenCalled();
    const firstArgs = contentAssetCreate.mock.calls[0]?.[0] as {
      data: { metadata: { visual_analysis: unknown } };
    };
    expect(firstArgs.data.metadata.visual_analysis).toBeNull();
    expect(res.moodboard_assets.length).toBeGreaterThan(0);
    expect(res.moodboard_assets[0]!.visual_analysis).toBeNull();
  });
});
