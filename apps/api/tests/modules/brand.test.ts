import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

const projectFindUnique = vi.fn();
const brandProfileUpsert = vi.fn();
const brandProfileFindUnique = vi.fn();
const brandProfileUpdate = vi.fn();
const socialAccountFindMany = vi.fn(async () => []);

vi.mock('@radikal/db', () => ({
  prisma: {
    project: { findUnique: projectFindUnique },
    brandProfile: {
      upsert: brandProfileUpsert,
      findUnique: brandProfileFindUnique,
      update: brandProfileUpdate,
    },
    socialAccount: { findMany: socialAccountFindMany },
  },
}));

vi.mock('../../src/modules/ai-services/index.js', () => ({
  brandSynthesizer: {
    synthesize: vi.fn(async () => ({
      tone: 't',
      voice: 'v',
      values: ['a'],
      audience: { segments: ['seg'] },
      visual: { palette: ['#000'], direction: 'dir' },
      summary: 's',
    })),
  },
}));

describe('brandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upsert maps snake_case inputs to camelCase Prisma data', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    brandProfileUpsert.mockResolvedValue({ id: 'bp1' });

    const { brandService } = await import('../../src/modules/brand/service.js');
    await brandService.upsert('u1', {
      project_id: 'p1',
      tone: 'friendly',
      voice: 'clear',
      values: ['trust'],
      audience: 'founders',
      visual: 'minimal',
      summary: 'summary',
    });
    const call = brandProfileUpsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
      create: Record<string, unknown>;
    };
    expect(call.update.voiceTone).toBe('friendly / clear');
    expect(call.update.brandValues).toEqual(['trust']);
    expect(call.update.targetAudience).toBe('founders');
    expect(call.update.visualDirection).toBe('minimal');
    expect(call.update.essence).toBe('summary');
    expect(call.create.userId).toBe('u1');
  });

  it('upsert throws Forbidden when not owner', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'other' });
    const { brandService } = await import('../../src/modules/brand/service.js');
    await expect(
      brandService.upsert('u1', { project_id: 'p1', tone: 'x' }),
    ).rejects.toThrow();
  });

  it('acceptSuggestion copies colorPaletteSuggested → colorPalette', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    brandProfileFindUnique.mockResolvedValue({
      id: 'bp1',
      colorPaletteSuggested: ['#fff', '#000'],
    });
    brandProfileUpdate.mockResolvedValue({ id: 'bp1', colorPalette: ['#fff', '#000'] });

    const { brandService } = await import('../../src/modules/brand/service.js');
    await brandService.acceptSuggestion('u1', { project_id: 'p1', field: 'color_palette' });
    const call = brandProfileUpdate.mock.calls[0]?.[0] as { data: { colorPalette: string[] } };
    expect(call.data.colorPalette).toEqual(['#fff', '#000']);
  });

  it('acceptSuggestion throws NotFound when brand profile absent', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    brandProfileFindUnique.mockResolvedValue(null);
    const { brandService } = await import('../../src/modules/brand/service.js');
    await expect(
      brandService.acceptSuggestion('u1', { project_id: 'p1', field: 'color_palette' }),
    ).rejects.toThrow();
  });

  it('generate uses synthesizer and upserts with mapped fields', async () => {
    projectFindUnique.mockResolvedValue({ id: 'p1', userId: 'u1', name: 'Acme' });
    brandProfileUpsert.mockResolvedValue({ id: 'bp1' });
    const { brandService } = await import('../../src/modules/brand/service.js');
    await brandService.generate('u1', 'p1');
    const call = brandProfileUpsert.mock.calls[0]?.[0] as {
      update: Record<string, unknown>;
    };
    expect(call.update.voiceTone).toBe('t / v');
    expect(call.update.aiGenerated).toBe(true);
  });
});
