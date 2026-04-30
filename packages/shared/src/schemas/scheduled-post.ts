import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';

const ScheduledPostStatus = z.enum(['scheduled', 'published', 'cancelled', 'failed']);
const ScheduledPostPlatform = z.enum([
  'instagram', 'tiktok', 'linkedin', 'facebook', 'x', 'threads', 'pinterest', 'youtube', 'other',
]);

export const ScheduledPostSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  user_id: IdSchema,
  asset_id: IdSchema.nullable().optional(),
  platforms: z.array(ScheduledPostPlatform),
  caption: z.string().nullable().optional(),
  hashtags: z.array(z.string()).default([]),
  scheduled_at: DateSchema,
  status: ScheduledPostStatus,
  published_at: DateSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const CreateScheduledPostSchema = z.object({
  project_id: IdSchema,
  asset_id: IdSchema.optional().nullable(),
  platforms: z.array(ScheduledPostPlatform).min(1),
  caption: z.string().optional().nullable(),
  hashtags: z.array(z.string()).optional(),
  scheduled_at: z.string().datetime({ offset: true }),
  notes: z.string().optional().nullable(),
});

export type ScheduledPost = z.infer<typeof ScheduledPostSchema>;
export type CreateScheduledPost = z.infer<typeof CreateScheduledPostSchema>;
