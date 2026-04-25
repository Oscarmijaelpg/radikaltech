import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';

export const MemorySchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  key: z.string().min(1),
  value: z.string(),
  tags: z.array(z.string()).default([]),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const CreateMemorySchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export type Memory = z.infer<typeof MemorySchema>;
export type CreateMemory = z.infer<typeof CreateMemorySchema>;
