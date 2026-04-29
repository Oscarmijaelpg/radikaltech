import { z } from 'zod';
import { DateSchema, IdSchema } from './common.js';

export const NotificationSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  projectId: IdSchema.nullable(),
  kind: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  actionUrl: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: DateSchema,
});

export type Notification = z.infer<typeof NotificationSchema>;
