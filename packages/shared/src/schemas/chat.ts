import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { MessageRole } from '../enums.js';

export const ChatSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  projectId: IdSchema.nullable(),
  agentId: z.string().nullable(),
  agentIds: z.array(z.string()),
  title: z.string().nullable(),
  isArchived: z.boolean(),
  folderId: IdSchema.nullable(),
  objectiveId: IdSchema.nullable(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

export const MessageSchema = z.object({
  id: IdSchema,
  chatId: IdSchema,
  userId: IdSchema,
  role: z.nativeEnum(MessageRole),
  content: z.string(),
  tokensUsed: z.number().int().nullable(),
  metadata: z.unknown(),
  createdAt: DateSchema,
});

export const ChatFolderSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  projectId: IdSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

export const CreateChatSchema = z.object({
  agent_id: z.string().optional(),
  agent_ids: z.array(z.string()).optional(),
  project_id: IdSchema.nullable().optional(),
  title: z.string().optional(),
});

export const SendMessageSchema = z.object({
  chat_id: IdSchema,
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type Chat = z.infer<typeof ChatSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ChatFolder = z.infer<typeof ChatFolderSchema>;
export type CreateChat = z.infer<typeof CreateChatSchema>;
export type SendMessage = z.infer<typeof SendMessageSchema>;
