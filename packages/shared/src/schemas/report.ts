import { z } from 'zod';
import { DateSchema, IdSchema } from './common.js';

export const ReportTypeSchema = z.enum([
  'competition',
  'monthly_audit',
  'brand_strategy',
  'news',
  'general',
]);

export const ReportSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  userId: IdSchema,
  title: z.string(),
  reportType: ReportTypeSchema,
  content: z.string().nullable(),
  summary: z.string().nullable(),
  keyInsights: z.array(z.string()),
  version: z.number().int(),
  sourceData: z.unknown(),
  createdAt: DateSchema,
});

export type ReportType = z.infer<typeof ReportTypeSchema>;
export type Report = z.infer<typeof ReportSchema>;
