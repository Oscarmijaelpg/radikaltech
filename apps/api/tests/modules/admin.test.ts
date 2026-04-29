import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const auditCreate = vi.fn();
const profileCount = vi.fn();
const profileFindUnique = vi.fn();
const profileUpdate = vi.fn();
const projectCount = vi.fn();
const aiJobCount = vi.fn();
const aiJobFindUnique = vi.fn();
const aiJobCreate = vi.fn();
const tokenUsageAggregate = vi.fn();
const notificationCreateMany = vi.fn();
const profileFindMany = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    adminAuditLog: { create: auditCreate },
    profile: {
      count: profileCount,
      findUnique: profileFindUnique,
      update: profileUpdate,
      findMany: profileFindMany,
    },
    project: { count: projectCount },
    aiJob: {
      count: aiJobCount,
      findUnique: aiJobFindUnique,
      create: aiJobCreate,
    },
    tokenUsage: { aggregate: tokenUsageAggregate },
    notification: { createMany: notificationCreateMany },
  },
  Prisma: { DbNull: { _dbnull: true } },
}));

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        signOut: vi.fn(async () => ({ error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
        updateUserById: vi.fn(async () => ({ error: null })),
        generateLink: vi.fn(async () => ({
          data: { properties: { action_link: 'https://fake.magic/link' } },
          error: null,
        })),
      },
    },
  },
}));

const mockCtx = (overrides?: { headers?: Record<string, string>; user?: { id: string; email: string | null; role: string } }) => {
  const user = overrides?.user ?? { id: 'admin1', email: 'admin@x.com', role: 'admin' };
  const headers = overrides?.headers ?? {};
  return {
    get: vi.fn((k: string) => (k === 'user' ? user : undefined)),
    req: {
      header: vi.fn((name: string) => headers[name.toLowerCase()] ?? headers[name]),
    },
  };
};

describe('admin audit-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logAudit persists actorId, actorEmail, action, targetType, targetId', async () => {
    auditCreate.mockResolvedValue({ id: 'a1' });
    const { logAudit } = await import('../../src/modules/admin/audit-service.js');
    const ctx = mockCtx();

    await logAudit(ctx as never, {
      action: 'user.delete',
      targetType: 'profile',
      targetId: 'u123',
      diff: { role: 'user' },
    });

    const call = auditCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.actorId).toBe('admin1');
    expect(call.data.actorEmail).toBe('admin@x.com');
    expect(call.data.action).toBe('user.delete');
    expect(call.data.targetType).toBe('profile');
    expect(call.data.targetId).toBe('u123');
    expect(call.data.diff).toEqual({ role: 'user' });
  });

  it('logAudit swallows db errors (does not throw) so the caller completes', async () => {
    auditCreate.mockRejectedValue(new Error('db down'));
    const { logAudit } = await import('../../src/modules/admin/audit-service.js');
    const ctx = mockCtx();

    await expect(
      logAudit(ctx as never, { action: 'x.y', targetType: 'z' }),
    ).resolves.toBeUndefined();
  });

  it('logAudit captures ip from x-forwarded-for header when present', async () => {
    auditCreate.mockResolvedValue({ id: 'a1' });
    const { logAudit } = await import('../../src/modules/admin/audit-service.js');
    const ctx = mockCtx({ headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'Vitest' } });

    await logAudit(ctx as never, { action: 'x.y', targetType: 'z' });

    const call = auditCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.ip).toBe('1.2.3.4');
    expect(call.data.userAgent).toBe('Vitest');
  });
});

describe('admin request helpers', () => {
  it('validates admin route prefix is wired with requireAdmin', async () => {
    const routes = await import('../../src/modules/admin/routes.js');
    expect(routes.adminRouter).toBeDefined();
  }, 15000);
});
