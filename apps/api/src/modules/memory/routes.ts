import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { memoryService } from './service.js';

const createSchema = z.object({
  project_id: z.string().uuid(),
  category: z.string().min(1).max(60),
  key: z.string().max(200).optional().nullable(),
  value: z.string().min(1),
  metadata: z.record(z.unknown()).optional().nullable(),
});

const updateSchema = z.object({
  category: z.string().min(1).max(60).optional(),
  key: z.string().max(200).optional().nullable(),
  value: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

const listQuerySchema = z.object({
  project_id: z.string().uuid(),
  category: z.string().optional(),
});

function serializeMemory(m: {
  id: string;
  projectId: string | null;
  userId: string;
  category: string;
  key: string;
  value: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    project_id: m.projectId,
    user_id: m.userId,
    category: m.category,
    key: m.key,
    value: m.value,
    metadata: m.metadata,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}

function serializeBrand(b: {
  id: string;
  projectId: string;
  userId: string;
  essence: string | null;
  mission: string | null;
  vision: string | null;
  brandValues: string[];
  keywords: string[];
  targetAudience: string | null;
  competitiveAdvantage: string | null;
  portfolio: string | null;
  voiceTone: string | null;
  visualDirection: string | null;
  colorPalette: unknown;
  colorPaletteSuggested?: unknown;
  visualAnalysisSummary?: string | null;
  moodboardData?: unknown;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
} | null) {
  if (!b) return null;
  return {
    id: b.id,
    project_id: b.projectId,
    user_id: b.userId,
    essence: b.essence,
    mission: b.mission,
    vision: b.vision,
    brand_values: b.brandValues,
    keywords: b.keywords,
    target_audience: b.targetAudience,
    competitive_advantage: b.competitiveAdvantage,
    portfolio: b.portfolio,
    voice_tone: b.voiceTone,
    visual_direction: b.visualDirection,
    color_palette: b.colorPalette,
    color_palette_suggested: b.colorPaletteSuggested ?? null,
    visual_analysis_summary: b.visualAnalysisSummary ?? null,
    moodboard_data: b.moodboardData ?? null,
    ai_generated: b.aiGenerated,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

export const memoryRouter = new Hono<{ Variables: AuthVariables }>();

memoryRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id, category } = c.req.valid('query');
  const items = await memoryService.list(user.id, project_id, category);
  return c.json(ok(items.map(serializeMemory)));
});

memoryRouter.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const created = await memoryService.create(user.id, {
    project_id: body.project_id,
    category: body.category,
    key: body.key ?? null,
    value: body.value,
    metadata: body.metadata ?? null,
  });
  return c.json(ok(serializeMemory(created)), 201);
});

memoryRouter.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const updated = await memoryService.update(c.req.param('id'), user.id, {
    category: body.category,
    key: body.key,
    value: body.value,
    metadata: body.metadata,
  });
  return c.json(ok(serializeMemory(updated)));
});

memoryRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const res = await memoryService.remove(c.req.param('id'), user.id);
  return c.json(ok(res));
});

memoryRouter.get('/brand/:project_id', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('project_id');
  const brand = await memoryService.getBrand(projectId, user.id);
  return c.json(ok(serializeBrand(brand)));
});
