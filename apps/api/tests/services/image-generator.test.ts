import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    GEMINI_API_KEY: 'g',
    OPENROUTER_API_KEY: 'or',
    OPENAI_API_KEY: 'oa',
    LOG_LEVEL: 'silent',
  },
}));

const mockBrand = {
  colorPalette: ['#ABCDEF', '#123456'],
  voiceTone: 'playful',
  visualDirection: 'minimal',
  brandValues: ['bold', 'honest'],
};
const mockProject = { companyName: 'Acme', industry: 'saas' };

const aiJobCreate = vi.fn();
const aiJobUpdate = vi.fn();
const assetCreate = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    brandProfile: { findUnique: vi.fn(async () => mockBrand) },
    project: { findUnique: vi.fn(async () => mockProject) },
    aiJob: {
      create: (args: unknown) => aiJobCreate(args),
      update: (args: unknown) => aiJobUpdate(args),
    },
    contentAsset: {
      findMany: vi.fn(async () => [
        { id: 'ref1', userId: 'u1', assetUrl: 'https://cdn.example.com/ref.png' },
      ]),
      create: (args: unknown) => assetCreate(args),
    },
  },
}));

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ data: {}, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://pub/x.png' } })),
      }),
    },
  },
}));

// Minimal 1×1 PNG (67 bytes) — passes the >1024 size check via padding
const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const FAKE_IMAGE_BUF = Buffer.from(TINY_PNG_B64, 'base64');
// Pad to exceed the 1024 byte minimum for downloadAsBase64
const PADDED_IMAGE = Buffer.concat([FAKE_IMAGE_BUF, Buffer.alloc(1024)]);

function makeFetchMock(captured: { lastOpenRouterBody?: string }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith('https://cdn.example.com')) {
      // reference image download
      return new Response(PADDED_IMAGE, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    }
    if (u.includes('openrouter.ai')) {
      captured.lastOpenRouterBody = String(init?.body ?? '');
      const bodyStr = String(init?.body ?? '');
      // Text synthesis call ("openai/gpt-4o") → fail so synthesizePrompt falls back to raw context
      if (bodyStr.includes('"openai/gpt-4o"')) {
        return new Response('{}', { status: 429 });
      }
      // Image generation call (google/ models) → return inline image data
      const imgB64 = Buffer.alloc(16).toString('base64');
      return new Response(
        JSON.stringify({
          choices: [{
            message: {
              content: [
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imgB64}` } },
              ],
            },
          }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 500 });
  });
}

describe('ImageGenerator brand palette enrichment', () => {
  beforeEach(() => {
    aiJobCreate.mockReset().mockResolvedValue({ id: 'job-1' });
    aiJobUpdate.mockReset().mockResolvedValue({});
    assetCreate.mockReset().mockResolvedValue({ id: 'asset-1' });
  });

  it('includes brand palette in enriched prompt when useBrandPalette=true', async () => {
    const captured: { lastOpenRouterBody?: string } = {};
    vi.stubGlobal('fetch', makeFetchMock(captured));

    const { ImageGenerator } = await import('../../src/modules/ai-services/image-generator/index.js');
    const gen = new ImageGenerator();
    await gen.generate({
      prompt: 'a product shot',
      userId: 'u1',
      projectId: 'p1',
      referenceAssetIds: ['ref1'],
      useBrandPalette: true,
    });

    // enrichedPrompt stored in aiJob.create input should contain brand colors
    const firstCreateCall = aiJobCreate.mock.calls[0]?.[0] as { data: { input: { enrichedPrompt: string } } };
    const enriched = String(firstCreateCall.data.input.enrichedPrompt);
    expect(enriched).toContain('#ABCDEF');
    expect(enriched).toContain('#123456');
    expect(enriched).toMatch(/Paleta/i);
  });

  it('omits palette when useBrandPalette=false', async () => {
    const captured: { lastOpenRouterBody?: string } = {};
    vi.stubGlobal('fetch', makeFetchMock(captured));

    const { ImageGenerator } = await import('../../src/modules/ai-services/image-generator/index.js');
    const gen = new ImageGenerator();
    await gen.generate({
      prompt: 'a product shot',
      userId: 'u1',
      projectId: 'p1',
      referenceAssetIds: ['ref1'],
      useBrandPalette: false,
    });

    const firstCreateCall = aiJobCreate.mock.calls[0]?.[0] as { data: { input: { enrichedPrompt: string } } };
    expect(firstCreateCall.data.input.enrichedPrompt).not.toContain('#ABCDEF');
    expect(firstCreateCall.data.input.enrichedPrompt).not.toMatch(/Paleta obligatoria/i);
  });
});
