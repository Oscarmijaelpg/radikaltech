import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';

export const MemorySchema = z.object({
  id: IdSchema,
  project_id: IdSchema.nullable(),
  user_id: IdSchema,
  category: z.string().min(1),
  key: z.string(),
  value: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const CreateMemorySchema = z.object({
  project_id: IdSchema,
  category: z.string().min(1),
  key: z.string().optional(),
  value: z.string().min(1),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type Memory = z.infer<typeof MemorySchema>;
export type CreateMemory = z.infer<typeof CreateMemorySchema>;
