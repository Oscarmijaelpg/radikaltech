import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';

export const CompetitorSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  user_id: IdSchema,
  name: z.string().min(1),
  website: z.string().url().nullable().optional(),
  social_links: z.record(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
  last_analyzed_at: DateSchema.nullable().optional(),
  analysis_data: z.record(z.unknown()).nullable().optional(),
  engagement_stats: z.record(z.unknown()).nullable().optional(),
  narrative: z.record(z.unknown()).nullable().optional(),
  narrative_generated_at: DateSchema.nullable().optional(),
  status: z.string().default('confirmed'),
  source: z.string().default('manual'),
  detected_at: DateSchema.nullable().optional(),
  created_at: DateSchema,
});

export const CreateCompetitorSchema = z.object({
  project_id: IdSchema,
  name: z.string().min(1).max(200),
  website: z.string().url().optional().nullable(),
  social_links: z.record(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateCompetitorSchema = CreateCompetitorSchema.omit({ project_id: true }).partial();

export type Competitor = z.infer<typeof CompetitorSchema>;
export type CreateCompetitor = z.infer<typeof CreateCompetitorSchema>;
export type UpdateCompetitor = z.infer<typeof UpdateCompetitorSchema>;
