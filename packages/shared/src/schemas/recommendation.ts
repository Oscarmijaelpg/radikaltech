import { z } from 'zod';
import { DateSchema, IdSchema } from './common.js';

export const RecommendationStatusSchema = z.enum([
  'new',
  'saved',
  'in_progress',
  'completed',
  'dismissed',
]);

export const RecommendationKindSchema = z.enum([
  'post',
  'campaign',
  'strategy',
  'report',
  'content_improvement',
  'competitor_response',
  'news_reaction',
]);

export const RecommendationImpactSchema = z.enum(['high', 'medium', 'low']);

export const RecommendationActionKindSchema = z.enum([
  'navigate_image_gen',
  'navigate_chat',
  'create_scheduled_post',
  'open_competitor',
  'generate_report',
  'open_news',
  'custom',
]);

export const RecommendationSourceSchema = z.object({
  type: z.union([
    z.enum(['news', 'competitor', 'brand', 'asset', 'memory']),
    z.string(),
  ]),
  id: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
});

export const RecommendationSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  userId: IdSchema,
  kind: RecommendationKindSchema,
  title: z.string(),
  why: z.string(),
  actionLabel: z.string(),
  actionKind: z.union([RecommendationActionKindSchema, z.string()]),
  actionPayload: z.record(z.unknown()).nullable(),
  impact: RecommendationImpactSchema,
  sources: z.array(RecommendationSourceSchema),
  status: RecommendationStatusSchema,
  userNotes: z.string().nullable(),
  completedAt: DateSchema.nullable(),
  generatedAt: DateSchema,
  updatedAt: DateSchema,
});

export type RecommendationStatus = z.infer<typeof RecommendationStatusSchema>;
export type RecommendationKind = z.infer<typeof RecommendationKindSchema>;
export type RecommendationImpact = z.infer<typeof RecommendationImpactSchema>;
export type RecommendationActionKind = z.infer<typeof RecommendationActionKindSchema>;
export type RecommendationSource = z.infer<typeof RecommendationSourceSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
