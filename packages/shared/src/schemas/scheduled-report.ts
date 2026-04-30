import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';

const ScheduledReportKind = z.enum(['news_digest', 'competition_weekly', 'brand_monthly', 'custom']);
const ScheduledReportFrequency = z.enum(['daily', 'weekly', 'monthly']);

export const ScheduledReportSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  user_id: IdSchema,
  kind: ScheduledReportKind,
  frequency: ScheduledReportFrequency,
  title: z.string().min(1),
  config: z.record(z.unknown()).nullable().optional(),
  next_run_at: DateSchema,
  last_run_at: DateSchema.nullable().optional(),
  enabled: z.boolean().default(true),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const CreateScheduledReportSchema = z.object({
  project_id: IdSchema,
  kind: ScheduledReportKind,
  frequency: ScheduledReportFrequency,
  title: z.string().min(1).max(300),
  config: z.record(z.unknown()).optional().nullable(),
  next_run_at: z.string().datetime({ offset: true }),
});

export type ScheduledReport = z.infer<typeof ScheduledReportSchema>;
export type CreateScheduledReport = z.infer<typeof CreateScheduledReportSchema>;
