import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';

export const BrandProfileSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  tone_of_voice: z.string().nullable().optional(),
  personality: z.array(z.string()).default([]),
  values: z.array(z.string()).default([]),
  target_audience: z.string().nullable().optional(),
  brand_story: z.string().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  forbidden_words: z.array(z.string()).default([]),
  color_palette: z.array(z.string()).default([]),
  fonts: z.array(z.string()).default([]),
  logo_url: z.string().url().nullable().optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const UpsertBrandProfileSchema = z.object({
  tone_of_voice: z.string().optional().nullable(),
  personality: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  target_audience: z.string().optional().nullable(),
  brand_story: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional(),
  forbidden_words: z.array(z.string()).optional(),
  color_palette: z.array(z.string()).optional(),
  fonts: z.array(z.string()).optional(),
  logo_url: z.string().url().optional().nullable(),
});

export type BrandProfile = z.infer<typeof BrandProfileSchema>;
export type UpsertBrandProfile = z.infer<typeof UpsertBrandProfileSchema>;
