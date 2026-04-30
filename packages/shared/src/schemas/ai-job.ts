import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { JobStatus } from '../enums.js';

export const AiJobSchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  project_id: IdSchema.nullable().optional(),
  kind: z.string().min(1),
  status: z.nativeEnum(JobStatus),
  input: z.record(z.unknown()).nullable().optional(),
  output: z.record(z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  started_at: DateSchema.nullable().optional(),
  finished_at: DateSchema.nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: DateSchema,
});

export type AiJob = z.infer<typeof AiJobSchema>;
