import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    WEB_URL: 'http://localhost:3000',
    SUPABASE_URL: 'http://localhost',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'srv',
    DATABASE_URL: 'postgres://x',
    LOG_LEVEL: 'silent',
  },
}));

vi.mock('@radikal/db', () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]) },
}));

describe('health', () => {
  it('returns ok', async () => {
    const { healthRouter } = await import('../src/modules/health/routes.js');
    const res = await healthRouter.request('/');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; db: string };
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });
});
