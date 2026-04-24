import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    TAVILY_API_KEY: 'tv-test',
    LOG_LEVEL: 'silent',
  },
}));

const aiJobCreate = vi.fn(async () => ({ id: 'job-1' }));
const aiJobUpdate = vi.fn(async () => ({}));
const reportCreate = vi.fn(async () => ({
  id: 'r1',
  title: 'Noticias: topic',
  summary: '1. A',
  createdAt: new Date('2025-01-01'),
}));

vi.mock('@radikal/db', () => ({
  prisma: {
    aiJob: { create: aiJobCreate, update: aiJobUpdate },
    report: { create: reportCreate },
  },
  Prisma: {},
}));

describe('NewsAggregator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns news items from Tavily', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: [
            { title: 'A', url: 'https://news.com/a', content: 'c1', published_date: '2025-01-01' },
            { title: 'B', url: 'https://other.com/b', content: 'c2' },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { NewsAggregator } = await import('../../src/modules/ai-services/news-aggregator/index.js');
    const na = new NewsAggregator();
    const res = await na.aggregate({ topic: 'topic', userId: 'u1' });
    expect(res.result.items.length).toBe(2);
    expect(res.result.items[0]?.source).toBe('news.com');
    expect(res.result.items[0]?.summary).toBe('c1');
    expect(reportCreate).not.toHaveBeenCalled();
  });

  it('creates a report when projectId is present', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ results: [{ title: 'A', url: 'https://x.com/a', content: 'c1' }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { NewsAggregator } = await import('../../src/modules/ai-services/news-aggregator/index.js');
    const na = new NewsAggregator();
    const res = await na.aggregate({ topic: 'topic', userId: 'u1', projectId: 'p1' });
    expect(reportCreate).toHaveBeenCalled();
    expect(res.report?.id).toBe('r1');
  });

  it('handles Tavily failure gracefully (empty items)', async () => {
    const fetchMock = vi.fn(async () => new Response('err', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const { NewsAggregator } = await import('../../src/modules/ai-services/news-aggregator/index.js');
    const na = new NewsAggregator();
    const res = await na.aggregate({ topic: 'topic', userId: 'u1' });
    expect(res.result.items).toEqual([]);
  });
});

describe('NewsAggregator (no Tavily key)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns empty items when TAVILY_API_KEY missing', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        NODE_ENV: 'test',
        WEB_URL: 'http://localhost:3000',
        TAVILY_API_KEY: undefined,
        LOG_LEVEL: 'silent',
      },
    }));
    vi.doMock('@radikal/db', () => ({
      prisma: {
        aiJob: { create: aiJobCreate, update: aiJobUpdate },
        report: { create: reportCreate },
      },
      Prisma: {},
    }));
    const { NewsAggregator } = await import('../../src/modules/ai-services/news-aggregator/index.js');
    const na = new NewsAggregator();
    const res = await na.aggregate({ topic: 'topic', userId: 'u1' });
    expect(res.result.items).toEqual([]);
  });
});
