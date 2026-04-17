import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    TAVILY_API_KEY: 'tv',
    OPENROUTER_API_KEY: 'or',
    OPENAI_API_KEY: 'oa',
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

  it('builds a prompt that instructs to discard wikipedia/linkedin/facebook domains', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      operatingCountries: ['CO'],
      operatingCountriesSuggested: [],
      industry: 'saas',
      industryCustom: null,
      businessSummary: 'We build CRM for SMB.',
    });
    mockPrisma.aiJob.create.mockResolvedValue({ id: 'job-1' });
    mockPrisma.aiJob.update.mockResolvedValue({});
    mockPrisma.competitor.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'c1',
      name: data.name,
      website: data.website ?? null,
    }));

    const aiBodies: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('tavily.com')) {
        return new Response(
          JSON.stringify({
            results: [
              { title: 'Acme CRM', url: 'https://acme.com', content: 'crm', score: 1 },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (u.includes('openrouter') || u.includes('openai.com')) {
        aiBodies.push(String(init?.body ?? ''));
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    competitors: [
                      { name: 'Good', website: 'https://good.com', description: 'ok', country: 'CO', why_competitor: 'direct' },
                      // These simulate "what we DO NOT want in output"; our filter must drop them.
                      { name: 'Wiki', website: 'https://wikipedia.org/wiki/Acme', description: 'x', country: 'US', why_competitor: 'x' },
                      { name: 'Ln', website: 'https://linkedin.com/company/acme', description: 'x', country: 'US', why_competitor: 'x' },
                      { name: 'Fb', website: 'https://facebook.com/acme', description: 'x', country: 'US', why_competitor: 'x' },
                    ],
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

    const { AutoCompetitorDetector } = await import(
      '../../src/modules/ai-services/auto-competitor-detector.js'
    );
    const det = new AutoCompetitorDetector();
    await det.detect({ projectId: 'p1', userId: 'u1' });

    expect(aiBodies.length).toBeGreaterThan(0);
    const systemMsg = aiBodies.join('\n');
    // Built prompt must explicitly instruct the model to drop these domains.
    expect(systemMsg).toMatch(/Wikipedia/i);
    expect(systemMsg).toMatch(/LinkedIn/i);
    expect(systemMsg).toMatch(/redes sociales|redes/i);
  });
});
