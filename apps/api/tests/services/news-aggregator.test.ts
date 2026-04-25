import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    MOONSHOT_API_KEY: 'msk-test',
    LOG_LEVEL: 'silent',
  },
}));

const mockPrisma = {
  project: { findUnique: vi.fn() },
  aiJob: { create: vi.fn(), update: vi.fn() },
  report: { create: vi.fn() },
};
vi.mock('@radikal/db', () => ({ prisma: mockPrisma, Prisma: {} }));

function moonshotResponse(content: string) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content },
        },
      ],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('NewsAggregator (Moonshot Kimi K2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPrisma.project.findUnique.mockReset();
    mockPrisma.aiJob.create.mockReset();
    mockPrisma.aiJob.update.mockReset();
    mockPrisma.report.create.mockReset();
  });

  it('agrega contexto del proyecto al prompt, parsea items y enriquece con authority', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      companyName: 'Radikal',
      industry: 'saas',
      industryCustom: null,
      businessSummary: 'CRM para PYMES',
      uniqueValue: null,
      mainProducts: 'CRM',
      operatingCountries: 'CO',
      operatingCountriesSuggested: null,
    });
    mockPrisma.aiJob.create.mockResolvedValue({ id: 'job-1' });
    mockPrisma.aiJob.update.mockResolvedValue({});
    mockPrisma.report.create.mockImplementation(async ({ data }: { data: { title: string } }) => ({
      id: 'rep-1',
      title: data.title,
      summary: 'sum',
      createdAt: new Date('2026-04-23T00:00:00Z'),
    }));

    const moonshotBodies: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('api.moonshot.ai')) {
        moonshotBodies.push(String(init?.body ?? ''));
        return moonshotResponse(
          JSON.stringify({
            items: [
              {
                title: 'Reuters publica datos del sector CRM',
                url: 'https://reuters.com/article/crm',
                source: 'Reuters',
                published_at: '2026-04-15',
                summary: 'CRM crece en LATAM',
                sentiment: 'positive',
                relevance_score: 92,
                relevance_reason: 'Validación de mercado',
              },
              {
                title: 'Blog desconocido habla de CRM',
                url: 'https://random-blog.example/post',
                source: 'random-blog.example',
                summary: 'meh',
                sentiment: 'neutral',
                relevance_score: 30,
                relevance_reason: 'baja',
              },
            ],
            executive_summary: 'El sector CRM se acelera en LATAM con foco en PYMES.',
            narrative: '## Panorama\nEl sector está en expansión.',
            key_insights: ['CRM crece en CO', 'PYMES adoptan SaaS'],
            trending_keywords: ['CRM', 'PYMES', 'LATAM'],
            top_themes: [{ name: 'expansión', count: 2, description: 'Mercado en crecimiento' }],
            overall_sentiment: 'positive',
          }),
        );
      }
      return new Response('{}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { NewsAggregator } = await import(
      '../../src/modules/ai-services/news-aggregator/index.js'
    );
    const agg = new NewsAggregator();
    const res = await agg.aggregate({ topic: 'CRM PYMES', userId: 'u1', projectId: 'p1' });

    expect(moonshotBodies[0]).toMatch(/web_search/);
    expect(moonshotBodies[0]).toMatch(/CRM PYMES/);
    expect(moonshotBodies[0]).toMatch(/Radikal/);
    expect(moonshotBodies[0]).toMatch(/CO/);

    expect(res.result.items).toHaveLength(2);
    expect(res.result.items[0]!.source).toBe('Reuters');
    expect(res.result.analysis?.executive_summary).toMatch(/sector CRM/);
    expect(res.result.analysis?.items_enriched?.[0]?.source_authority).toBe(95);
    expect(res.result.analysis?.items_enriched?.[0]?.relevance_score).toBe(92);
    expect(res.result.analysis?.sentiment_breakdown).toEqual({ positive: 1, neutral: 1, negative: 0 });
    expect(res.report?.id).toBe('rep-1');
    expect(mockPrisma.report.create).toHaveBeenCalledOnce();
  });

  it('si Kimi no devuelve items, no falla y guarda report con narrativa', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p2',
      companyName: 'Acme',
      industry: 'fintech',
      industryCustom: null,
      businessSummary: 'X',
      uniqueValue: null,
      mainProducts: null,
      operatingCountries: 'MX',
      operatingCountriesSuggested: null,
    });
    mockPrisma.aiJob.create.mockResolvedValue({ id: 'job-2' });
    mockPrisma.aiJob.update.mockResolvedValue({});
    mockPrisma.report.create.mockImplementation(async ({ data }: { data: { title: string } }) => ({
      id: 'rep-2',
      title: data.title,
      summary: null,
      createdAt: new Date(),
    }));

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        moonshotResponse(
          JSON.stringify({
            items: [],
            executive_summary: 'No hubo noticias relevantes en el período.',
            narrative: '## Sin novedades\nNo se identificaron noticias.',
            key_insights: [],
            trending_keywords: [],
            top_themes: [],
            overall_sentiment: 'neutral',
          }),
        ),
      ),
    );

    const { NewsAggregator } = await import(
      '../../src/modules/ai-services/news-aggregator/index.js'
    );
    const agg = new NewsAggregator();
    const res = await agg.aggregate({ topic: 'X', userId: 'u1', projectId: 'p2' });

    expect(res.result.items).toHaveLength(0);
    expect(res.result.analysis?.narrative).toMatch(/Sin novedades/);
    expect(res.report?.id).toBe('rep-2');
  });

  it('tolera respuestas con ```json fences', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p3',
      companyName: 'Brand',
      industry: 'd2c',
      industryCustom: null,
      businessSummary: 'Y',
      uniqueValue: null,
      mainProducts: null,
      operatingCountries: 'CO',
      operatingCountriesSuggested: null,
    });
    mockPrisma.aiJob.create.mockResolvedValue({ id: 'job-3' });
    mockPrisma.aiJob.update.mockResolvedValue({});
    mockPrisma.report.create.mockResolvedValue({
      id: 'rep-3',
      title: 'X',
      summary: null,
      createdAt: new Date(),
    });

    const wrapped =
      '```json\n' +
      JSON.stringify({
        items: [
          {
            title: 'Forbes opina sobre D2C',
            url: 'https://forbes.com/d2c',
            source: 'Forbes',
            sentiment: 'positive',
            relevance_score: 80,
            relevance_reason: 'Tendencia',
          },
        ],
        executive_summary: 'D2C en alza',
        narrative: '## D2C\nCrece',
        key_insights: ['D2C en CO'],
        trending_keywords: ['D2C'],
        top_themes: [],
        overall_sentiment: 'positive',
      }) +
      '\n```';

    vi.stubGlobal('fetch', vi.fn(async () => moonshotResponse(wrapped)));

    const { NewsAggregator } = await import(
      '../../src/modules/ai-services/news-aggregator/index.js'
    );
    const agg = new NewsAggregator();
    const res = await agg.aggregate({ topic: 'D2C', userId: 'u1', projectId: 'p3' });

    expect(res.result.items).toHaveLength(1);
    expect(res.result.items[0]!.source).toBe('Forbes');
  });
});
