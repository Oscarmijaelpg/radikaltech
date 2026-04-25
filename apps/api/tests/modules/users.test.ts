import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const profileFindUnique = vi.fn();
const profileUpdate = vi.fn();

vi.mock('@radikal/db', () => ({
  prisma: {
    profile: { findUnique: profileFindUnique, update: profileUpdate },
  },
}));

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        deleteUser: vi.fn(async () => ({ error: null })),
      },
    },
  },
}));

const baseProfile = {
  id: 'u1',
  email: 'a@b.com',
  fullName: 'Oscar',
  phone: null,
  language: 'es',
  role: 'user',
  avatarUrl: null,
  onboardingCompleted: true,
  onboardingStep: 5,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
};

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMe returns serialized profile (snake_case)', async () => {
    profileFindUnique.mockResolvedValue(baseProfile);
    const { usersService } = await import('../../src/modules/users/service.js');
    const me = await usersService.getMe('u1');
    expect(me.full_name).toBe('Oscar');
    expect(me.avatar_url).toBeNull();
    expect(me.onboarding_completed).toBe(true);
    expect(me.created_at).toBe('2025-01-01T00:00:00.000Z');
  });

  it('getMe throws NotFound when profile missing', async () => {
    profileFindUnique.mockResolvedValue(null);
    const { usersService } = await import('../../src/modules/users/service.js');
    await expect(usersService.getMe('u1')).rejects.toThrow();
  });

  it('getById serializes too', async () => {
    profileFindUnique.mockResolvedValue(baseProfile);
    const { usersService } = await import('../../src/modules/users/service.js');
    const p = await usersService.getById('u1');
    expect(p.id).toBe('u1');
    expect(p.email).toBe('a@b.com');
  });

  it('updateMe maps snake_case inputs (full_name, avatar_url, locale)', async () => {
    profileUpdate.mockResolvedValue({ ...baseProfile, fullName: 'New' });
    const { usersService } = await import('../../src/modules/users/service.js');
    await usersService.updateMe('u1', {
      full_name: 'New',
      avatar_url: 'https://x/y.png',
      locale: 'en',
    });
    const call = profileUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.fullName).toBe('New');
    expect(call.data.avatarUrl).toBe('https://x/y.png');
    expect(call.data.language).toBe('en');
  });
});
