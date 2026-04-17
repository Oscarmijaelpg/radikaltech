import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    GEMINI_API_KEY: 'g',
    OPENROUTER_API_KEY: 'or',
    LOG_LEVEL: 'silent',
  },
}));

vi.mock('@radikal/db', () => ({
  prisma: {
    contentAsset: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
  },
}));

describe('ImageAnalyzer fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back from Gemini 404 to OpenRouter', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      calls.push(u);
      if (u.startsWith('https://cdn.example.com')) {
        // image download — 1000 bytes of binary
        return new Response(new Uint8Array(1024), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }
      if (u.includes('generativelanguage.googleapis.com')) {
        return new Response('not found', { status: 404 });
      }
      if (u.includes('openrouter.ai')) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    dominant_colors: ['#112233', '#445566'],
                    lighting: 'natural',
                    mood: 'calm',
                    composition: 'centered',
                    style_tags: ['clean'],
                    description: 'a nice image',
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { ImageAnalyzer } = await import('../../src/modules/ai-services/image-analyzer.js');
    const analyzer = new ImageAnalyzer();
    const out = await analyzer.analyze('https://cdn.example.com/img.png');

    expect(out).not.toBeNull();
    expect(out?.dominant_colors).toEqual(['#112233', '#445566']);
    expect(calls.some((u) => u.includes('generativelanguage'))).toBe(true);
    expect(calls.some((u) => u.includes('openrouter'))).toBe(true);
  });
});
