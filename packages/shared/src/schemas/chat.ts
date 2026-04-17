import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { MessageRole } from '../enums.js';

export const ChatSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  title: z.string().nullable().optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const MessageSchema = z.object({
  id: IdSchema,
  chat_id: IdSchema,
  role: z.nativeEnum(MessageRole),
  content: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: DateSchema,
});

export const CreateChatSchema = z.object({
  project_id: IdSchema,
  title: z.string().optional().nullable(),
});

export const SendMessageSchema = z.object({
  chat_id: IdSchema,
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type Chat = z.infer<typeof ChatSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type CreateChat = z.infer<typeof CreateChatSchema>;
export type SendMessage = z.infer<typeof SendMessageSchema>;
