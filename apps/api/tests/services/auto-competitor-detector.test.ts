import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    GEMINI_API_KEY: 'gem',
    LOG_LEVEL: 'silent',
  },
}));

const mockPrisma = {
  project: { findUnique: vi.fn() },
  aiJob: { create: vi.fn(), update: vi.fn() },
  competitor: { create: vi.fn() },
};
vi.mock('@radikal/db', () => ({ prisma: mockPrisma }));

describe('AutoCompetitorDetector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPrisma.project.findUnique.mockReset();
    mockPrisma.aiJob.create.mockReset();
    mockPrisma.aiJob.update.mockReset();
    mockPrisma.competitor.create.mockReset();
  });

  it('parses JSON from Gemini, drops excluded hosts and persists real competitors', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      companyName: 'Radikal',
      operatingCountries: ['CO'],
      operatingCountriesSuggested: [],
      industry: 'saas',
      industryCustom: null,
      businessSummary: 'We build CRM for SMB.',
      mainProducts: [],
      uniqueValue: null,
    });
    mockPrisma.aiJob.create.mockResolvedValue({ id: 'job-1' });
    mockPrisma.aiJob.update.mockResolvedValue({});
    mockPrisma.competitor.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'c1',
        name: data.name,
        website: data.website ?? null,
        socialLinks: data.socialLinks ?? {},
      }),
    );

    const geminiBodies: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('generativelanguage.googleapis.com')) {
        geminiBodies.push(String(init?.body ?? ''));
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        { name: 'Good', website: 'https://good.com', description: 'crm para pymes', country: 'CO', why_competitor: 'direct' },
                        { name: 'Wiki', website: 'https://es.wikipedia.org/wiki/CRM', description: 'x', country: 'US', why_competitor: 'x' },
                        { name: 'Ln', website: 'https://linkedin.com/company/acme', description: 'x', country: 'US', why_competitor: 'x' },
                        { name: 'Fb', website: 'https://facebook.com/acme', description: 'x', country: 'US', why_competitor: 'x' },
                      ]),
                    },
                  ],
                },
                groundingMetadata: {
                  groundingChunks: [{ web: { uri: 'https://good.com/about', title: 'Good' } }],
                  webSearchQueries: ['competidores CRM Colombia'],
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

    const { AutoCompetitorDetector } = await import(
      '../../src/modules/ai-services/auto-competitor-detector.js'
    );
    const det = new AutoCompetitorDetector();
    const res = await det.detect({ projectId: 'p1', userId: 'u1' });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(geminiBodies[0]).toMatch(/googleSearch/);
    expect(geminiBodies[0]).toMatch(/CRM|SMB/);

    expect(mockPrisma.competitor.create).toHaveBeenCalledOnce();
    const createdArg = mockPrisma.competitor.create.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(createdArg.data.name).toBe('Good');
    expect(createdArg.data.website).toBe('https://good.com');

    expect(res.competitors).toHaveLength(1);
    expect(res.competitors[0]!.name).toBe('Good');
  });

  it('tolera respuesta envuelta en ```json ... ``` y filtra hosts excluidos', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p2',
      userId: 'u1',
      companyName: 'Acme',
      operatingCountries: [],
      operatingCountriesSuggested: ['MX'],
      industry: 'fintech',
      industryCustom: null,
      businessSummary: 'Pagos',
      mainProducts: [],
      uniqueValue: null,
    });
    mockPrisma.aiJob.create.mockResolvedValue({ id: 'job-2' });
    mockPrisma.aiJob.update.mockResolvedValue({});
    mockPrisma.competitor.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'x',
        name: data.name,
        website: data.website ?? null,
        socialLinks: data.socialLinks ?? {},
      }),
    );

    const wrapped =
      '```json\n' +
      JSON.stringify([
        { name: 'Kueski', website: 'https://kueski.com', description: 'préstamos mx', country: 'MX', why_competitor: 'mismo mercado' },
        { name: 'Twitter-thing', website: 'https://twitter.com/kueski', description: 'x', country: 'MX', why_competitor: 'x' },
      ]) +
      '\n```';

    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('generativelanguage.googleapis.com')) {
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: wrapped }] } }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { AutoCompetitorDetector } = await import(
      '../../src/modules/ai-services/auto-competitor-detector.js'
    );
    const det = new AutoCompetitorDetector();
    const res = await det.detect({ projectId: 'p2', userId: 'u1' });

    expect(res.competitors).toHaveLength(1);
    expect(res.competitors[0]!.name).toBe('Kueski');
  });
});
