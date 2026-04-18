import { z } from 'zod';
import { DateSchema, IdSchema } from './common.js';

export const BrandProfileSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  user_id: IdSchema,
  essence: z.string().nullable(),
  mission: z.string().nullable(),
  vision: z.string().nullable(),
  brand_values: z.array(z.string()),
  keywords: z.array(z.string()),
  target_audience: z.string().nullable(),
  competitive_advantage: z.string().nullable(),
  portfolio: z.string().nullable(),
  voice_tone: z.string().nullable(),
  visual_direction: z.string().nullable(),
  color_palette: z.unknown(),
  color_palette_suggested: z.unknown().optional(),
  visual_analysis_summary: z.string().nullable().optional(),
  moodboard_data: z
    .object({
      generated_at: z.string().optional(),
      asset_ids: z.array(z.string()).optional(),
      dominant_palette: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  ai_generated: z.boolean(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const UpsertBrandProfileSchema = z.object({
  essence: z.string().optional().nullable(),
  mission: z.string().optional().nullable(),
  vision: z.string().optional().nullable(),
  brand_values: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  target_audience: z.string().optional().nullable(),
  competitive_advantage: z.string().optional().nullable(),
  portfolio: z.string().optional().nullable(),
  voice_tone: z.string().optional().nullable(),
  visual_direction: z.string().optional().nullable(),
  color_palette: z.unknown().optional(),
});

export type BrandProfile = z.infer<typeof BrandProfileSchema>;
export type UpsertBrandProfile = z.infer<typeof UpsertBrandProfileSchema>;
