import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { ObjectiveStatus } from '../enums.js';

export const ObjectiveSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(ObjectiveStatus).default(ObjectiveStatus.ACTIVE),
  priority: z.number().int().min(0).default(0),
  target_date: DateSchema.nullable().optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const CreateObjectiveSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ObjectiveStatus).default(ObjectiveStatus.ACTIVE).optional(),
  priority: z.number().int().min(0).default(0).optional(),
  target_date: z.string().datetime({ offset: true }).optional().nullable(),
});

export type Objective = z.infer<typeof ObjectiveSchema>;
export type CreateObjective = z.infer<typeof CreateObjectiveSchema>;
