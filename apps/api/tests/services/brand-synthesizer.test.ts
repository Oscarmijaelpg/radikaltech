import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    OPENROUTER_API_KEY: 'or-test',
    LOG_LEVEL: 'silent',
  },
}));

const aiJobCreate = vi.fn(async () => ({ id: 'job-1' }));
const aiJobUpdate = vi.fn(async () => ({}));

vi.mock('@radikal/db', () => ({
  prisma: {
    aiJob: { create: aiJobCreate, update: aiJobUpdate },
  },
  Prisma: {},
}));

describe('BrandSynthesizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns synthesis with OpenRouter JSON response', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tone: 'friendly',
                  voice: 'clear and bold',
                  values: ['innovation', 'trust'],
                  audience: { segments: ['saas founders'], demographics: { age: '25-40' } },
                  visual: {
                    palette: ['#ff0000', '#00ff00'],
                    typography: ['Inter'],
                    direction: 'minimal',
                  },
                  summary: 'Summary for brand',
                  mission: 'Our mission',
                  vision: 'Our vision',
                  competitive_advantage: 'Advantage',
                  keywords: ['k1', 'k2'],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { BrandSynthesizer } = await import('../../src/modules/ai-services/brand-synthesizer.js');
    const s = new BrandSynthesizer();
    const res = await s.synthesize({
      project: { id: 'p1', name: 'Acme' },
      userId: 'u1',
    });
    expect(res.tone).toBe('friendly');
    expect(res.voice).toBe('clear and bold');
    expect(res.values).toEqual(['innovation', 'trust']);
    expect(res.mission).toBe('Our mission');
    expect(res.vision).toBe('Our vision');
    expect(res.visual.palette.length).toBeGreaterThan(0);
    expect(aiJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'succeeded' }) }),
    );
  });

  it('falls back to placeholder when OpenRouter returns malformed JSON', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'not valid json' } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { BrandSynthesizer } = await import('../../src/modules/ai-services/brand-synthesizer.js');
    const s = new BrandSynthesizer();
    const res = await s.synthesize({
      project: { id: 'p1', name: 'Acme' },
      userId: 'u1',
    });
    // placeholder values
    expect(res.tone).toBe('professional');
    expect(res.values).toContain('innovation');
    expect(res.visual.palette.length).toBeGreaterThan(0);
  });

  it('marks job failed when OpenRouter responds non-OK', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const { BrandSynthesizer } = await import('../../src/modules/ai-services/brand-synthesizer.js');
    const s = new BrandSynthesizer();
    await expect(
      s.synthesize({ project: { id: 'p1', name: 'Acme' }, userId: 'u1' }),
    ).rejects.toThrow();
    expect(aiJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    );
  });
});

describe('BrandSynthesizer (no API key)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns placeholder when OPENROUTER_API_KEY is missing', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        NODE_ENV: 'test',
        WEB_URL: 'http://localhost:3000',
        OPENROUTER_API_KEY: undefined,
        LOG_LEVEL: 'silent',
      },
    }));
    vi.doMock('@radikal/db', () => ({
      prisma: { aiJob: { create: aiJobCreate, update: aiJobUpdate } },
      Prisma: {},
    }));
    const { BrandSynthesizer } = await import('../../src/modules/ai-services/brand-synthesizer.js');
    const s = new BrandSynthesizer();
    const res = await s.synthesize({ project: { id: 'p1', name: 'Acme' }, userId: 'u1' });
    expect(res.tone).toBe('professional');
    expect(res.summary).toContain('Acme');
  });
});
