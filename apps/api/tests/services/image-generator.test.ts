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

function makeFetchMock(captured: { lastGeminiBody?: string }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith('https://cdn.example.com')) {
      // reference image download
      return new Response(new Uint8Array(1024), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    }
    if (u.includes('generativelanguage')) {
      captured.lastGeminiBody = String(init?.body ?? '');
      // Simulate a successful gemini image-generation response
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inline_data: { mime_type: 'image/png', data: Buffer.from('x').toString('base64') },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    // dalle path not used
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
    const captured: { lastGeminiBody?: string } = {};
    vi.stubGlobal('fetch', makeFetchMock(captured));

    const { ImageGenerator } = await import('../../src/modules/ai-services/image-generator/index.js');
    const gen = new ImageGenerator();
    await gen.generate({
      prompt: 'a product shot',
      userId: 'u1',
      projectId: 'p1',
      referenceAssetIds: ['ref1'], // forces gemini path
      useBrandPalette: true,
    });

    // The enriched prompt is sent on the aiJob.create input, and also sent to gemini.
    const firstCreateCall = aiJobCreate.mock.calls[0]?.[0] as { data: { input: { enrichedPrompt: string } } };
    expect(firstCreateCall.data.input.enrichedPrompt).toContain('#ABCDEF');
    expect(firstCreateCall.data.input.enrichedPrompt).toContain('#123456');
    expect(firstCreateCall.data.input.enrichedPrompt).toMatch(/Paleta/i);
  });

  it('omits palette when useBrandPalette=false', async () => {
    const captured: { lastGeminiBody?: string } = {};
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
