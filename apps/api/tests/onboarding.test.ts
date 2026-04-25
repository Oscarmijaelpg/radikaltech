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
  prisma: {},
  Prisma: {},
}));

import { stepBodySchema } from '../src/modules/onboarding/service.js';

describe('onboarding schemas', () => {
  it('validates company step', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'company',
      data: {
        company_name: 'Radikal',
        industry: 'SaaS',
        website_source: 'none',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects social account without url when source=url', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'socials',
      data: {
        accounts: [{ platform: 'instagram', source: 'url' }],
      },
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts manual social account with description (source=manual)', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'socials',
      data: {
        accounts: [
          {
            platform: 'instagram',
            source: 'manual',
            manual_description: 'Our IG voice is playful and vibrant',
          },
        ],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts socials step with empty accounts (source=none default)', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'socials',
      data: { accounts: [] },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts social with source=none and no url/description', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'socials',
      data: {
        accounts: [{ platform: 'tiktok', source: 'none' }],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('company step accepts website_source=manual with description', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'company',
      data: {
        company_name: 'Radikal',
        industry: 'SaaS',
        website_source: 'manual',
        website_manual_description: 'Somos una empresa de SaaS B2B',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('company step accepts website_source=none without url', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'company',
      data: {
        company_name: 'Radikal',
        industry: 'SaaS',
        website_source: 'none',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('company step rejects missing required company_name', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'company',
      data: { industry: 'SaaS' },
    });
    expect(parsed.success).toBe(false);
  });

  it('manual social rejects too short description', () => {
    const parsed = stepBodySchema.safeParse({
      step: 'socials',
      data: {
        accounts: [
          { platform: 'instagram', source: 'manual', manual_description: 'short' },
        ],
      },
    });
    expect(parsed.success).toBe(false);
  });

  it('discriminates by step and rejects unknown', () => {
    const bad = stepBodySchema.safeParse({ step: 'unknown', data: {} });
    expect(bad.success).toBe(false);
  });
});
