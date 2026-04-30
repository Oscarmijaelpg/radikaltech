import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    WEB_URL: 'http://localhost:3000',
    OPENAI_API_KEY: 'oa-test',
    LOG_LEVEL: 'silent',
  },
}));

// Mock image-analyzer so ContentEvaluator doesn't make real HTTP calls
vi.mock('../../src/modules/ai-services/image-analyzer.js', () => ({
  imageAnalyzer: {
    analyze: vi.fn(async () => ({
      aesthetic_score: 8.5,
      tags: ['modern', 'clean'],
      style_tags: ['modern'],
      suggestions: ['improve contrast'],
      detected_elements: ['person', 'sky'],
      dominant_colors: ['#aabbcc'],
      lighting: 'natural',
      mood: 'calm',
      composition: 'centered',
      description: 'test image',
      full_narrative: 'LIFESTYLE: Test. Analysis.',
      category: 'LIFESTYLE',
      subject: 'Test',
    })),
  },
}));

const contentAssetFindUnique = vi.fn();
const contentAssetUpdate = vi.fn(async () => ({}));
const aiJobCreate = vi.fn(async () => ({ id: 'job-1' }));
const aiJobUpdate = vi.fn(async () => ({}));

vi.mock('@radikal/db', () => ({
  prisma: {
    contentAsset: { findUnique: contentAssetFindUnique, update: contentAssetUpdate },
    aiJob: { create: aiJobCreate, update: aiJobUpdate },
  },
  Prisma: {},
}));

describe('ContentEvaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evaluates image asset and updates metadata', async () => {
    contentAssetFindUnique.mockResolvedValue({
      id: 'a1',
      userId: 'u1',
      projectId: 'p1',
      assetType: 'image',
      assetUrl: 'https://cdn/img.jpg',
      metadata: { existing: true },
      tags: [],
    });

    const { ContentEvaluator } = await import('../../src/modules/ai-services/content-evaluator.js');
    const e = new ContentEvaluator();
    const res = await e.evaluate({ assetId: 'a1', userId: 'u1' });
    expect(res.result.aesthetic_score).toBe(8.5);
    expect(res.result.tags).toContain('modern');
    expect(contentAssetUpdate).toHaveBeenCalled();
    const updateCall = contentAssetUpdate.mock.calls[0]?.[0] as {
      data: { aestheticScore: number; metadata: Record<string, unknown> };
    };
    expect(updateCall.data.aestheticScore).toBe(8.5);
    expect(updateCall.data.metadata.suggestions).toEqual(['improve contrast']);
    expect(updateCall.data.metadata.existing).toBe(true); // preserved
  });

  it('returns placeholder (no Vision call) for non-image assets', async () => {
    contentAssetFindUnique.mockResolvedValue({
      id: 'a1',
      userId: 'u1',
      projectId: 'p1',
      assetType: 'video',
      assetUrl: 'https://cdn/v.mp4',
      metadata: null,
      tags: [],
    });

    const { ContentEvaluator } = await import('../../src/modules/ai-services/content-evaluator.js');
    const e = new ContentEvaluator();
    const res = await e.evaluate({ assetId: 'a1', userId: 'u1' });
    expect(res.result.aesthetic_score).toBe(0);
    expect(res.result.marketing_feedback).toMatch(/imágenes/i);
  });

  it('throws Forbidden when asset belongs to other user', async () => {
    contentAssetFindUnique.mockResolvedValue({
      id: 'a1',
      userId: 'other',
      projectId: 'p1',
      assetType: 'image',
      assetUrl: 'x',
      metadata: null,
    });
    const { ContentEvaluator } = await import('../../src/modules/ai-services/content-evaluator.js');
    const e = new ContentEvaluator();
    await expect(e.evaluate({ assetId: 'a1', userId: 'u1' })).rejects.toThrow();
  });

  it('throws NotFound when asset missing', async () => {
    contentAssetFindUnique.mockResolvedValue(null);
    const { ContentEvaluator } = await import('../../src/modules/ai-services/content-evaluator.js');
    const e = new ContentEvaluator();
    await expect(e.evaluate({ assetId: 'a1', userId: 'u1' })).rejects.toThrow();
  });
});
