import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { ObjectiveStatus } from '../enums.js';

export const ObjectiveSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  userId: IdSchema,
  name: z.string(),
  description: z.string().nullable(),
  targetValue: z.union([z.number(), z.string()]).nullable(),
  currentValue: z.union([z.number(), z.string()]).nullable(),
  unit: z.string().nullable(),
  status: z.nativeEnum(ObjectiveStatus),
  deadline: DateSchema.nullable(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

export const CreateObjectiveSchema = z.object({
  project_id: IdSchema,
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  kpi: z.string().optional(),
  target_value: z.number().optional(),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  status: z.nativeEnum(ObjectiveStatus).optional(),
});

export type Objective = z.infer<typeof ObjectiveSchema>;
export type CreateObjective = z.infer<typeof CreateObjectiveSchema>;
