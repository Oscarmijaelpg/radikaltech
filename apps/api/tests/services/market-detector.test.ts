import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    OPENROUTER_API_KEY: 'or',
    LOG_LEVEL: 'silent',
  },
}));

const projectFindUnique = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
  },
}));

describe('MarketDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns countries/regions when confidence >= 0.5', async () => {
    projectFindUnique.mockResolvedValue({
      id: 'p1',
      businessSummary: 'We ship to Peru and Bolivia'.repeat(3),
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  countries: ['pe', 'bo'],
                  regions: ['Lima'],
                  confidence: 0.9,
                  evidence: 'ships there',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { MarketDetector } = await import('../../src/modules/ai-services/market-detector.js');
    const m = new MarketDetector();
    const res = await m.detect({
      projectId: 'p1',
      userId: 'u1',
      websiteMarkdown: 'We ship to Peru and Bolivia. Content long enough to pass filter. '.repeat(3),
    });
    expect(res.countries).toEqual(['PE', 'BO']);
    expect(res.regions).toEqual(['Lima']);
    expect(res.confidence).toBe(0.9);
  });

  it('returns empty when confidence < 0.5', async () => {
    projectFindUnique.mockResolvedValue({
      id: 'p1',
      businessSummary: 'long description of business'.repeat(3),
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  countries: ['PE'],
                  regions: [],
                  confidence: 0.2,
                  evidence: '',
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { MarketDetector } = await import('../../src/modules/ai-services/market-detector.js');
    const m = new MarketDetector();
    const res = await m.detect({
      projectId: 'p1',
      userId: 'u1',
      websiteMarkdown: 'long markdown content to pass filter. '.repeat(5),
    });
    expect(res.countries).toEqual([]);
    expect(res.confidence).toBe(0.2);
  });

  it('returns empty when project content too small', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', businessSummary: '' });
    const { MarketDetector } = await import('../../src/modules/ai-services/market-detector.js');
    const m = new MarketDetector();
    const res = await m.detect({ projectId: 'p1', userId: 'u1', websiteMarkdown: '' });
    expect(res.countries).toEqual([]);
  });

  it('returns empty when project not found', async () => {
    projectFindUnique.mockResolvedValue(null);
    const { MarketDetector } = await import('../../src/modules/ai-services/market-detector.js');
    const m = new MarketDetector();
    const res = await m.detect({ projectId: 'nope', userId: 'u1' });
    expect(res.countries).toEqual([]);
  });
});
