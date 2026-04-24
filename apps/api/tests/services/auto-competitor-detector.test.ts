import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    MOONSHOT_API_KEY: 'msk-test',
    MOONSHOT_MODEL: 'kimi-k2-0905-preview',
    LOG_LEVEL: 'silent',
  },
}));

const mockPrisma = {
  project: { findUnique: vi.fn() },
  aiJob: { create: vi.fn(), update: vi.fn() },
  competitor: { create: vi.fn() },
};
vi.mock('@radikal/db', () => ({ prisma: mockPrisma, Prisma: {} }));

function moonshotResponse(content: string, finishReason: 'stop' | 'tool_calls' = 'stop', toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: finishReason,
          message: {
            role: 'assistant',
            content,
            tool_calls: toolCalls?.map((t) => ({
              id: t.id,
              type: 'function',
              function: { name: t.name, arguments: JSON.stringify(t.args) },
            })),
          },
        },
      ],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('AutoCompetitorDetector (Moonshot Kimi K2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPrisma.project.findUnique.mockReset();
    mockPrisma.aiJob.create.mockReset();
    mockPrisma.aiJob.update.mockReset();
    mockPrisma.competitor.create.mockReset();
  });

  it('parsea JSON, filtra hosts excluidos y persiste competitors como suggested', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      companyName: 'Radikal',
      websiteUrl: 'https://radikal.tech',
      operatingCountries: 'CO',
      operatingCountriesSuggested: null,
      industry: 'saas',
      industryCustom: null,
      businessSummary: 'CRM para PYMES',
      mainProducts: 'CRM, pipelines',
      uniqueValue: null,
    });
    mockPrisma.aiJob.create.mockResolvedValue({ id: 'job-1' });
    mockPrisma.aiJob.update.mockResolvedValue({});
    mockPrisma.competitor.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: `rec-${String(data.name).toLowerCase()}`,
        name: data.name,
        website: data.website ?? null,
        socialLinks: data.socialLinks ?? {},
      }),
    );

    const moonshotBodies: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('api.moonshot.ai')) {
        moonshotBodies.push(String(init?.body ?? ''));
        return moonshotResponse(
          JSON.stringify({
            competitors: [
              {
                name: 'Pipedrive',
                website: 'https://pipedrive.com',
                country_hq: 'EE',
                country_competing: 'CO',
                business_model: 'CRM SaaS para PYMES',
                evidence_url: 'https://pipedrive.com/es',
                evidence_summary: 'Compite directamente: CRM en español para PYMES',
                social_links: { instagram: 'https://instagram.com/pipedrive' },
              },
              {
                name: 'WikiCRM',
                website: 'https://es.wikipedia.org/wiki/CRM',
                country_hq: 'US',
                country_competing: 'US',
                business_model: 'x',
                evidence_url: 'https://wikipedia.org',
                evidence_summary: 'x',
              },
              {
                name: 'AcmeLI',
                website: 'https://linkedin.com/company/acme',
                country_hq: 'US',
                country_competing: 'CO',
                business_model: 'x',
                evidence_url: 'https://linkedin.com/x',
                evidence_summary: 'x',
              },
            ],
          }),
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

    expect(moonshotBodies[0]).toMatch(/web_search/);
    expect(moonshotBodies[0]).toMatch(/CRM|PYMES/);
    expect(moonshotBodies[0]).toMatch(/thinking.*disabled/);

    const created = mockPrisma.competitor.create.mock.calls.map(
      (call) => (call[0] as { data: { name: string } }).data.name,
    );
    expect(created).toContain('Pipedrive');
    expect(created).not.toContain('WikiCRM');
    expect(created).not.toContain('AcmeLI');

    expect(res.competitors[0]!.name).toBe('Pipedrive');
    expect(res.competitors[0]!.country).toBe('CO');
    expect(res.competitors[0]!.social_links?.instagram).toBe('https://instagram.com/pipedrive');
  });

  it('soporta el loop de tool_calls de Kimi y devuelve la respuesta final', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p2',
      userId: 'u1',
      companyName: 'Acme',
      websiteUrl: null,
      operatingCountries: null,
      operatingCountriesSuggested: 'MX',
      industry: 'fintech',
      industryCustom: null,
      businessSummary: 'Pagos',
      mainProducts: null,
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

    let callCount = 0;
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('api.moonshot.ai')) {
        callCount += 1;
        if (callCount === 1) {
          return moonshotResponse('', 'tool_calls', [
            { id: 'call-1', name: '$web_search', args: { query: 'fintech mx competidores' } },
          ]);
        }
        return moonshotResponse(
          JSON.stringify({
            competitors: [
              {
                name: 'Kueski',
                website: 'https://kueski.com',
                country_hq: 'MX',
                country_competing: 'MX',
                business_model: 'préstamos en línea',
                evidence_url: 'https://kueski.com',
                evidence_summary: 'Compite directo en pagos MX',
              },
            ],
          }),
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

    expect(callCount).toBe(2);
    expect(res.competitors).toHaveLength(1);
    expect(res.competitors[0]!.name).toBe('Kueski');
  });

  it('maneja JSON envuelto en ```json fences', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p3',
      userId: 'u1',
      companyName: 'Brand',
      websiteUrl: null,
      operatingCountries: 'CO',
      operatingCountriesSuggested: null,
      industry: 'saas',
      industryCustom: null,
      businessSummary: 'X',
      mainProducts: null,
      uniqueValue: null,
    });
    mockPrisma.aiJob.create.mockResolvedValue({ id: 'job-3' });
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
      JSON.stringify({
        competitors: [
          {
            name: 'CleanCo',
            website: 'https://cleanco.com',
            country_hq: 'CO',
            country_competing: 'CO',
            business_model: 'x',
            evidence_url: 'https://cleanco.com',
            evidence_summary: 'x',
          },
        ],
      }) +
      '\n```';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => moonshotResponse(wrapped)),
    );

    const { AutoCompetitorDetector } = await import(
      '../../src/modules/ai-services/auto-competitor-detector.js'
    );
    const det = new AutoCompetitorDetector();
    const res = await det.detect({ projectId: 'p3', userId: 'u1' });

    expect(res.competitors).toHaveLength(1);
    expect(res.competitors[0]!.name).toBe('CleanCo');
  });
});
