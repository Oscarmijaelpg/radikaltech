import { describe, it, expect } from 'vitest';
import { serializeBrand } from '../../src/lib/serializers.js';

describe('serializeBrand', () => {
  it('returns null for nullish input', () => {
    expect(serializeBrand(null)).toBeNull();
    expect(serializeBrand(undefined)).toBeNull();
  });

  it('maps all new snake_case fields from Prisma camelCase', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const brand = {
      id: 'bp-1',
      projectId: 'p1',
      userId: 'u1',
      essence: 'e',
      mission: 'm',
      vision: 'v',
      brandValues: ['bold', 'honest'],
      keywords: ['saas', 'b2b'],
      targetAudience: 'pymes',
      competitiveAdvantage: 'speed',
      portfolio: 'pf',
      voiceTone: 'playful / cercano',
      visualDirection: 'minimal',
      colorPalette: ['#ABCDEF'],
      colorPaletteSuggested: ['#112233'],
      visualAnalysisSummary: 'summary',
      moodboardData: { asset_ids: ['a', 'b'] },
      aiGenerated: true,
      createdAt: now,
      updatedAt: now,
    };
    const out = serializeBrand(brand);
    expect(out).not.toBeNull();
    expect(out!.id).toBe('bp-1');
    expect(out!.project_id).toBe('p1');
    expect(out!.user_id).toBe('u1');
    expect(out!.brand_values).toEqual(['bold', 'honest']);
    expect(out!.keywords).toEqual(['saas', 'b2b']);
    expect(out!.target_audience).toBe('pymes');
    expect(out!.competitive_advantage).toBe('speed');
    expect(out!.voice_tone).toBe('playful / cercano');
    expect(out!.visual_direction).toBe('minimal');
    expect(out!.color_palette).toEqual(['#ABCDEF']);
    expect(out!.color_palette_suggested).toEqual(['#112233']);
    expect(out!.visual_analysis_summary).toBe('summary');
    expect(out!.moodboard_data).toEqual({ asset_ids: ['a', 'b'] });
    expect(out!.ai_generated).toBe(true);
    expect(out!.created_at).toBe('2025-01-01T00:00:00.000Z');
    expect(out!.updated_at).toBe('2025-01-01T00:00:00.000Z');
  });

  it('defaults arrays and booleans on a sparse record', () => {
    const out = serializeBrand({ id: 'x', projectId: 'p', userId: 'u' });
    expect(out!.brand_values).toEqual([]);
    expect(out!.keywords).toEqual([]);
    expect(out!.ai_generated).toBe(false);
    expect(out!.color_palette).toBeNull();
    expect(out!.color_palette_suggested).toBeNull();
    expect(out!.moodboard_data).toBeNull();
    expect(out!.created_at).toBeNull();
  });

  it('exposes all expected snake_case keys', () => {
    const out = serializeBrand({ id: 'x', projectId: 'p', userId: 'u' });
    const keys = Object.keys(out!).sort();
    expect(keys).toEqual(
      [
        'ai_generated',
        'brand_values',
        'color_palette',
        'color_palette_suggested',
        'competitive_advantage',
        'created_at',
        'essence',
        'id',
        'keywords',
        'mission',
        'moodboard_data',
        'portfolio',
        'project_id',
        'target_audience',
        'updated_at',
        'user_id',
        'vision',
        'visual_analysis_summary',
        'visual_direction',
        'voice_tone',
      ].sort(),
    );
  });
});
