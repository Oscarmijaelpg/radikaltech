import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { AssetType } from '../enums.js';

export const ContentAssetSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  user_id: IdSchema,
  asset_url: z.string().url(),
  asset_type: z.nativeEnum(AssetType),
  ai_description: z.string().nullable().optional(),
  aesthetic_score: z.union([z.number(), z.string()]).nullable().optional(),
  marketing_feedback: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: DateSchema,
});

export const CreateContentAssetSchema = z.object({
  project_id: IdSchema,
  asset_url: z.string().url(),
  asset_type: z.nativeEnum(AssetType),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type ContentAsset = z.infer<typeof ContentAssetSchema>;
export type CreateContentAsset = z.infer<typeof CreateContentAssetSchema>;
