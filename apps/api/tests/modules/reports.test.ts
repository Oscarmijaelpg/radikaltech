import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    OPENROUTER_API_KEY: 'or-test',
    LOG_LEVEL: 'silent',
  },
}));

const projectFindUnique = vi.fn();
const brandProfileFindUnique = vi.fn();
const reportCreate = vi.fn();
const competitorFindUnique = vi.fn();
const socialPostFindMany = vi.fn(async () => []);
const chatCount = vi.fn(async () => 0);
const assetCount = vi.fn(async () => 0);
const reportCount = vi.fn(async () => 0);
const jobCount = vi.fn(async () => 0);
const messageCount = vi.fn(async () => 0);

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    brandProfile: { findUnique: brandProfileFindUnique },
    report: { create: reportCreate, count: reportCount },
    competitor: { findUnique: competitorFindUnique },
    socialPost: { findMany: socialPostFindMany },
    chat: { count: chatCount },
    contentAsset: { count: assetCount },
    aiJob: { count: jobCount },
    message: { count: messageCount },
  },
}));

describe('reports generators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateBrandStrategy calls OpenRouter and persists report', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', name: 'Acme', industry: 'saas' });
    brandProfileFindUnique.mockResolvedValue({
      id: 'bp1',
      essence: 'e',
      brandValues: ['a'],
      keywords: ['k'],
    });
    reportCreate.mockResolvedValue({ id: 'r1', title: 'x' });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '# Diagnóstico\n- primero\n- segundo\n\n## Objetivos\n- crecer más rápido en canal digital este año\n- aumentar share\n\n## Iniciativas\n- campaña\n\n## Métricas\n- CAC bajar',
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { generateBrandStrategy } = await import('../../src/modules/reports/generators/index.js');
    const r = await generateBrandStrategy({ userId: 'u1', projectId: 'p1' });
    expect(r.id).toBe('r1');
    expect(reportCreate).toHaveBeenCalled();
    const data = (reportCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.reportType).toBe('brand_strategy');
    expect(String(data.content)).toContain('Diagnóstico');
  });

  it('generateBrandStrategy falls back when OpenRouter fails', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', name: 'Acme' });
    brandProfileFindUnique.mockResolvedValue(null);
    reportCreate.mockResolvedValue({ id: 'r1' });
    const fetchMock = vi.fn(async () => new Response('err', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const { generateBrandStrategy } = await import('../../src/modules/reports/generators/index.js');
    await generateBrandStrategy({ userId: 'u1', projectId: 'p1' });
    const data = (reportCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(String(data.content)).toContain('No fue posible generar');
  });

  it('generateMonthlyAudit aggregates counters and creates report', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', name: 'Acme' });
    chatCount.mockResolvedValue(5);
    assetCount.mockResolvedValue(3);
    reportCount.mockResolvedValue(1);
    jobCount.mockResolvedValue(7);
    messageCount.mockResolvedValue(20);
    reportCreate.mockResolvedValue({ id: 'r2' });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: '# Auditoría' } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { generateMonthlyAudit } = await import('../../src/modules/reports/generators/index.js');
    const r = await generateMonthlyAudit({ userId: 'u1', projectId: 'p1' });
    expect(r.id).toBe('r2');
    const data = (reportCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.reportType).toBe('monthly_audit');
    expect(data.summary).toContain('5 chats');
  });

  it('generateCompetitionReport throws when competitor not in project', async () => {
    competitorFindUnique.mockResolvedValue({ id: 'c1', projectId: 'different' });
    const { generateCompetitionReport } = await import(
      '../../src/modules/reports/generators/index.js'
    );
    await expect(
      generateCompetitionReport({ userId: 'u1', projectId: 'p1', competitorId: 'c1' }),
    ).rejects.toThrow();
  });

  it('generateCompetitionReport builds markdown from posts + analysis', async () => {
    competitorFindUnique.mockResolvedValue({
      id: 'c1',
      projectId: 'p1',
      name: 'Rival',
      website: 'https://rival.com',
      analysisData: {
        insights: ['fast growth'],
        competitors: [{ name: 'X', summary: 'y', strengths: ['s1'], weaknesses: ['w1'] }],
      },
    });
    socialPostFindMany.mockResolvedValue([
      {
        platform: 'instagram',
        caption: 'hello world',
        likes: 10,
        comments: 2,
        views: 0,
        shares: 0,
      },
    ]);
    reportCreate.mockResolvedValue({ id: 'r3' });
    const { generateCompetitionReport } = await import(
      '../../src/modules/reports/generators/index.js'
    );
    const r = await generateCompetitionReport({
      userId: 'u1',
      projectId: 'p1',
      competitorId: 'c1',
    });
    expect(r.id).toBe('r3');
    const data = (reportCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(String(data.content)).toContain('Rival');
    expect(String(data.content)).toContain('Benchmark');
  });
});
